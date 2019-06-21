'use strict';

const _ = require('underscore');
const LogHelper = require('../log');
const EventEmitter = require('events');
const DatabaseHelper = require('../database');
const log = new LogHelper('PluginInstance');
const status = ['initializing', 'configuration', 'ready', 'shutdown', 'error'];

/**
 * PluginInstance
 *
 * @class PluginInstance
 */
class PluginInstance extends EventEmitter {
    constructor (model, events) {
        super();

        this._model = model;
        this._status = 0;
        this._forks = 0;
        this._supported = [];
        this._config = null;
        this._version = null;
        this._events = events;
        this._shutdown = false;
        this._errors = {};
        this._cron = null;

        this._events.emit('update', {
            action: 'created',
            name: 'plugin-instance',
            model: this
        });

        this.on('change:errors', e => {
            const n = Object.entries(e).filter(e => e[1]).length;
            if (this._status === 2 && n > 0) {
                this._status = 4;
            }
            else if (this._status === 4 && n === 0) {
                this._status = 2;
            }
        });
        this._tryToInitialize();
    }

    _tryToInitialize () {
        this._initialize()
            .catch(err => {
                log.error(err);
                log.debug('Failed to initialize plugin %s, try again in 60 seconds…', this._model.id);

                setTimeout(() => {
                    this._tryToInitialize();
                }, 60 * 1000);
            });
    }


    /**
     * Initializes the instance by fetching the configuration
     * from the database, merge it with the plugin configuration
     * and emit the change:getConfig event.
     *
     * @returns {Promise.<void>}
     * @private
     */
    async _initialize () {
        log.debug('Initialize Plugin %s', this._model.id);

        try {
            /* eslint-disable security/detect-non-literal-require */
            this._version = require(this._model.type + '/package.json').version.toString();
            /* eslint-enable security/detect-non-literal-require */
        }
        catch (err) {
            log.warn('Unable to get version of plugin %s, try to install it…', this.type());

            try {
                const PluginHelper = require('./index');
                await PluginHelper._runPackageInstall(this.type());
            }
            catch (err) {
                log.warn('Unable to install plugin %s: %s', this.type(), err);
                log.fatal(err);
                process.exit(1);
            }

            try {
                /* eslint-disable security/detect-non-literal-require */
                this._version = require(this.type() + '/package.json').version.toString();
                /* eslint-enable security/detect-non-literal-require */
            }
            catch (err) {
                log.warn('Unable to get version of plugin %s directly, try fallback hack…', this.type());

                try {
                    const fs = require('fs');
                    const file = require.resolve(this.type())
                        .split(`/${this.type()}/`)[0] + `/${this.type()}/package.json`;
                    this._version = JSON.parse(fs.readFileSync(file, {encoding: 'utf8'})).version.toString();
                }
                catch (err) {
                    log.warn('Unable to get version of plugin %s, is it installed?', this.type());
                    log.fatal(err);
                    process.exit(1);
                }
            }

            log.warn('Okay, got it now, version of %s is %s', this.type(), this._version);
        }

        try {
            /* eslint-disable security/detect-non-literal-require */
            this._metainfo = require(this._model.type + '/.dwimm-plugin.json');
            /* eslint-enable security/detect-non-literal-require */
        }
        catch (err) {
            log.warn('Unable to get metadata of plugin %s…', this._model.type);
            log.fatal(err);
            process.exit(1);
        }

        // get configuration from database
        const dbConfigs = await DatabaseHelper.get('plugin-config').findAll({
            where: {
                pluginInstanceId: this._model.id
            }
        });

        // ask plugin for supported methods
        try {
            this._supported = await PluginInstance.request(this, this.type(), 'getSupported', {});
            log.info('Plugin %s supports: %s', this.type(), this._supported.join(', '));
        }
        catch (err) {
            log.warn('Unable to load supported methods of plugin `%s`, skip it…', this._model.type);
            throw err;
        }

        // ask plugin for configuration
        let config;
        try {
            config = await PluginInstance.request(this, this.type(), 'getConfig', {});
        }
        catch (err) {
            log.warn('Unable to load configuration of plugin `%s`, skip it…', this._model.type);
            throw err;
        }

        // delete unused configs in database
        dbConfigs.forEach(configModel => {
            if (!config.find(c => c.id === configModel.key)) {
                configModel.destory().catch(err => {
                    log.warn('Unable to remove unused plugin getConfig `%id`: %s', configModel.id, err);
                });
            }
        });

        // create configuration json
        this._config = config.map(config => {
            config.model = dbConfigs.find(configModel => config.id === configModel.key) || null;

            if (!config.value && config.model && config.model.value) {
                try {
                    config.value = JSON.parse(config.model.value);
                }
                catch (err) {
                    config.value = null;
                    log.warn('Unable to set plugin %s\'s config value for `%s`: %s', this.model.id, config.id, err);
                }
            }
            if (!config.value && config.defaultValue && config.defaultValue !== '{{email}}') {
                config.value = config.defaultValue;
            }

            if (!config.model) {
                config.model = DatabaseHelper.get('plugin-config').build();
                config.model.key = config.id;
                config.model.pluginInstanceId = this._model.id;
            }
            if (config.model.value !== JSON.stringify(config.value)) {
                config.model.value = JSON.stringify(config.value);
                if (config.model.value.length > 255) {
                    log.error('Plugin `%s`: Value for key `%s` is too long!', this._model.id, config.id);
                    config.model.value = null;
                }
            }

            return config;
        });

        await this.checkAndSaveConfig();

        this.emit('change:config');
        this._events.emit('update', {
            action: 'updated',
            name: 'plugin-instance',
            model: this
        });

        this.emit('initialized');
    }


    /**
     * Get the instance id of this plugin
     * @returns {string}
     */
    id () {
        return this._model.id;
    }

    /**
     * Get the type identifier of this plugin, this
     * mostly equals to the npm package name.
     *
     * @example "@dwimm/package-dummy"
     * @returns {string}
     */
    type () {
        return this._model.type;
    }

    /**
     * Returns the document id of the document this
     * plugin is associated to.
     * @returns {string}
     */
    documentId () {
        return this._model.documentId;
    }

    /**
     * Return the status of this plugin. One of:
     *  - initializing
     *  - configuration
     *  - ready
     *  - waiting
     *
     *  Returns a numeric value instead if numeric
     *  ist set to something truethy…
     *
     * @param {boolean} [numeric]
     * @returns {string|number}
     */
    status (numeric) {
        if (numeric) {
            return this._status;
        }
        return status[this._status];
    }

    /**
     * Returns the number of plugin threads currently
     * running for this instance. Use the `change:forks`
     * event to get notified about updates.
     *
     * @returns {number}
     */
    forks () {
        return this._forks || 0;
    }

    /**
     * Returns the sequelize model for this instance.
     * @returns {Sequelize.Model}
     */
    model () {
        return this._model;
    }

    /**
     * Returns list of supported methods…
     * @returns {Array<string>}
     */
    supported () {
        return this._supported;
    }

    /**
     * Returns a promise which gives you the current
     * configuration data for this plugin. As this is
     * intended to be given to the client, all secrets
     * (passwords) are hidden.
     *
     * @param {boolean} [instant]
     * @returns {object[]|Promise<object[]>}
     */
    config (instant) {
        if (this._config === null && !instant) {
            return new Promise(resolve => {
                this.once('change:config', () => {
                    resolve(this.config());
                });
            });
        }

        const config = JSON.parse(JSON.stringify(this._config || [])).map(field => {
            if (field.type === 'password' && field.value) {
                field.value = null;
            }

            return field;
        });

        if (instant) {
            return config;
        }

        return Promise.resolve(config);
    }

    /**
     * Get the plugin version definied in the package's
     * package.json file
     *
     * @returns {string|null}
     */
    version () {
        return this._version;
    }

    /**
     * Returnns an object with tha latest errors per method…
     *
     * @returns {object<string>}
     */
    errors () {
        return this._errors;
    }

    /**
     * Returns a json ready to serve to the client…
     *
     * @param {boolean} [instant]
     * @returns {object|Promise.<object>}
     */
    async toJSON (instant) {
        const config = instant ? (this.config(true) || []) : await this.config();
        return {
            id: this.id(),
            type: this.type(),
            version: this.version(),
            documentId: this.documentId(),
            status: this.status(),
            forks: this.forks(),
            supported: this.supported(),
            config: config.map(c => ({
                'id': c.id,
                'value': c.value || null,
                'defaultValue': c.defaultValue,
                'type': c.type,
                'label': c.label,
                'placeholder': c.placeholder,
                'lastError': c.lastError
            })),
            errors: this.errors()
        };
    }


    /**
     * Checks the current configuration by passing it to
     * the plugin to verify the given credentials. If
     * the plugin gives the okay, all the credetials are
     * saved in our database.
     *
     * Promise returns an array of errors in case validations
     * failed.
     *
     * @param {object} [values]
     * @returns {Promise.<object[]>}
     */
    async checkAndSaveConfig (values) {

        // build temporary getConfig
        const config = this.generateConfig(values);

        // check configuration with plugin
        let validation;
        try {
            validation = await PluginInstance.request(this, this.type(), 'validateConfig', JSON.parse(JSON.stringify(config || {})));
        }
        catch (err) {

            // stop cron
            if (this._cron) {
                clearInterval(this._cron);
                this._cron = null;
            }

            throw err;
        }

        // persistent configuration if valid
        if (validation.valid) {
            await Promise.all(this._config.map(field => {
                // overwrite new value
                field.value = config[field.id];
                field.model.value = JSON.stringify(field.value);

                // check length
                if (field.model.value.length > 255) {
                    throw new Error('Plugin `' + this._model.id + '`: Value for key `' + field.id + '` is too long!');
                }

                return field.model.save();
            }));
        }

        // update error codes
        this._config.forEach(config => {
            const error = (validation.errors || []).find(error => config.id === error.field);
            config.lastError = error ? error.code : null;
        });

        this.emit('change:config');


        // start / stop cron
        if (validation.valid && !this._cron) {
            (async () => {
                // wait 15 seconds to give other plugins a chance to start up
                await new Promise(cb => {
                    setTimeout(cb, 15000);
                });

                // run cron()
                await this.cron();
            })().catch(err => {
                log.error(err);
            });
            this._cron = setInterval(() => {
                this.cron().catch(err => {
                    log.warn('Unable to execute plugin `%s` cron: %s', this.type(), err);
                    log.error(err);
                });
            }, 1000 * 60 * 60 * 3);
        }
        else if (validation.valid && this._cron) {
            await this.cron();
        }
        else if (!validation.valid && this._cron) {
            clearInterval(this._cron);
            this._cron = null;
        }


        // set this._status
        this._status = validation.valid ? 2 : 1;
        this.emit('change:status');

        this._events.emit('update', {
            action: 'updated',
            name: 'plugin-instance',
            model: this
        });

        // return result
        return validation.errors || [];
    }


    /**
     * Starts all jobs required for this plugin.
     *
     * @returns {Promise.<void>}
     */
    async cron () {
        if (this._supported.indexOf('getAccounts') > -1 && this._supported.indexOf('getTransactions') > -1) {
            this.syncAccounts().catch(err => {
                log.error('Unable to sync transactions with plugin %s: %s', this.type(), err);
                log.error(err);
            });
        }
        if (this._supported.indexOf('getGoals') > -1) {
            this.syncGoals().catch(err => {
                log.error('Unable to sync goals with plugin %s: %s', this.type(), err);
                log.error(err);
            });
        }
    }

    /**
     * Synchronizes the accounts and their transactions…
     *
     * @returns {Promise.<void>}
     */
    async syncAccounts () {
        const accounts = await PluginInstance.request(this, this.type(), 'getAccounts', this.generateConfig());

        for (let i = 0; i < accounts.length; i++) {
            const account = accounts[i];

            try {
                await this.syncAccount(account);
            }
            catch (err) {
                log.error('Unable to sync account `%s` with plugin %s: %s', account.id, this.type(), err);
                log.error(err);
            }
        }
    }

    /**
     * Synchronizes one single account and it's transactions…
     *
     * @param {object} account
     * @param {string} account.id
     * @param {string} account.type
     * @param {string} account.name
     * @param {number} account.balance
     * @returns {Promise.<void>}
     */
    async syncAccount (account) {
        const AccountLogic = require('../../logic/account');
        const TransactionLogic = require('../../logic/transaction');
        const SummaryLogic = require('../../logic/summary');
        const PortionLogic = require('../../logic/portion');

        const moment = require('moment');

        let accountIsNew = false;

        // find account model
        let accountModel = await AccountLogic.getModel().findOne({
            where: {
                pluginInstanceId: this.id(),
                pluginsOwnId: account.id
            }
        });

        // create new account model if not already there
        if (!accountModel) {
            accountIsNew = true;
            accountModel = await AccountLogic.getModel().create({
                documentId: this.documentId(),
                pluginInstanceId: this.id(),
                pluginsOwnId: account.id,
                name: account.name,
                type: account.type
            });
        } else {
            const transactions = await TransactionLogic.getModel().count({
                where: {
                    accountId: account.id
                }
            });

            accountIsNew = transactions.length === 0;
        }

        // get newest cleared transaction
        const newestClearedTransaction = await TransactionLogic.getModel().findOne({
            attributes: ['time'],
            where: {
                status: 'cleared',
                accountId: accountModel.id
            },
            order: [
                ['time', 'DESC']
            ],
            limit: 1
        });

        // get oldest pending transaction
        const oldestPendingTransaction = await TransactionLogic.getModel().findOne({
            attributes: ['time'],
            where: {
                status: 'pending',
                accountId: accountModel.id
            },
            order: [
                ['time', 'ASC']
            ],
            limit: 1
        });


        // find out sync begin
        let syncBeginningFrom = moment().startOf('month');
        if (moment().date() < 15) {
            syncBeginningFrom = moment().subtract(1, 'month').startOf('month');
        }

        if (newestClearedTransaction) {
            log.info('Plugin %s: Newest cleared one: %s', this.id().substr(0, 5), newestClearedTransaction.time);
            syncBeginningFrom = moment(newestClearedTransaction.time).subtract(1, 'month').startOf('day');
        }
        if (oldestPendingTransaction && moment(oldestPendingTransaction.time).isBefore(syncBeginningFrom)) {
            log.info('Plugin %s: Oldest pending one: %s', this.id().substr(0, 5), oldestPendingTransaction.time);
            syncBeginningFrom = moment(oldestPendingTransaction.time).startOf('day');
        }


        log.info(
            'Plugin %s: Sync Transactions for %s beginning from %s',
            this.id().substr(0, 5), account.id.substr(0, 5), syncBeginningFrom
        );


        // get transactions
        const transactions = await PluginInstance.request(
            this,
            this.type(),
            'getTransactions',
            this.generateConfig(),
            {
                accountId: account.id,
                since: syncBeginningFrom.toJSON()
            }
        );

        log.info(
            'Plugin %s: Got %s transaction from plugin',
            this.id().substr(0, 5), transactions.length
        );


        await TransactionLogic.syncTransactions(accountModel, transactions.map(
            transaction => TransactionLogic.getModel().build({
                accountId: accountModel.id,
                pluginsOwnId: transaction.id,
                amount: transaction.amount,
                time: moment(transaction.time).toJSON(),
                pluginsOwnPayeeId: transaction.payeeId,
                status: transaction.status,
                pluginsOwnMemo: transaction.memo
            })
        ), {updateSummaries: false});

        log.info(
            'Plugin %s: Transactions synced',
            this.id().substr(0, 5)
        );


        // create balance transaction
        const accountJson = await AccountLogic.format(accountModel);

        log.debug(
            'Plugin %s: Balance after sync in DWIMM: %s, should be %s.',
            this.id().substr(0, 5),
            accountJson.balance,
            account.balance
        );

        const balanceTransactionValue = (account.balance || 0) - accountJson.balance;
        if (balanceTransactionValue !== 0) {
            log.debug('Plugin %s: Add balance transaction of %s', this.id().substr(0, 5), balanceTransactionValue);

            await TransactionLogic.getModel().create({
                time: moment(accountIsNew ? syncBeginningFrom : undefined).toJSON(),
                amount: balanceTransactionValue,
                status: 'cleared',
                accountId: accountModel.id,
                units: [],
                isReconciling: true
            });
        }

        await SummaryLogic.recalculateSummariesFrom(accountModel.documentId, syncBeginningFrom);
        await PortionLogic.recalculatePortionsFrom({month: syncBeginningFrom, documentId: accountModel.documentId});

        log.info(
            'Plugin %s: Account Sync completed!',
            this.id().substr(0, 5)
        );
    }

    /**
     * Ask the plugin to add any metadata it may finds
     *
     * @param {Model} transactionModel
     * @returns {Promise.<Model>}
     */
    async getMetadata (transactionModel) {
        if (!this._metainfo || !this._metainfo.responsibilities || !this._metainfo.responsibilities.length) {
            return transactionModel;
        }

        /* only ask plugin when payee matches */
        const match = this._metainfo.responsibilities.find(r => r.metadata && (
            transactionModel.pluginsOwnPayeeId.includes(r.name) ||
            (r.iban || []).find(i => transactionModel.pluginsOwnPayeeId.includes(i)) ||
            (r.payee || []).find(i => transactionModel.pluginsOwnPayeeId.includes(i))
        ));
        if (!match) {
            return transactionModel;
        }

        log.info(
            'Plugin %s: Get metadata for transaction where pluginsOwnPayeeID = %s',
            this.id().substr(0, 5), transactionModel.pluginsOwnPayeeId
        );


        // get metadata
        const metadata = await PluginInstance.request(this, this.type(), 'getMetadata', this.generateConfig(),
            {
                time: transactionModel.time,
                payeeId: transactionModel.pluginsOwnPayeeId,
                memo: transactionModel.pluginsOwnMemo,
                amount: transactionModel.amount
            }
        );
        log.info(
            'Plugin %s: Got %s metadata objects from plugin',
            this.id().substr(0, 5), metadata.length
        );

        // persist transaction to get it's id
        if (metadata.find(m => m.type === 'split')) {
            try {
                await transactionModel.save();
            }
            catch (err) {
                log.error('Unable to sync metadata: saving transaction failed.\n\n' + JSON.stringify(transactionModel.dataValues));
                throw err;
            }
        }

        metadata.forEach(m => {
            if (m.type === 'split' && !transactionModel.units) {
                transactionModel.units = Promise.all(
                    m.units.map(unit => DatabaseHelper.get('unit').create({
                        amount: unit.amount,
                        memo: unit.memo,
                        transactionId: transactionModel.id
                    }))
                );
            }
            else if (m.type === 'memo' && !transactionModel.memo) {
                transactionModel.memo = m.memo;
            }
        });

        return transactionModel;
    }

    /**
     * Synchronizes the goals this plugin provides…
     *
     * @returns {Promise<void>}
     */
    async syncGoals () {
        const goals = await PluginInstance.request(this, this.type(), 'getGoals', this.generateConfig());
        await Promise.all(
            goals.map(goal => this.syncGoal(goal).catch(err => {
                log.error('Unable to sync goal `%s` with plugin %s: %s', goal.id, this.type(), err);
                log.error(err);
            }))
        );
    }

    /**
     * Synchronizes a single goal with the database
     *
     * @param {Object} goal
     * @param {String} goal.id
     * @param {String} goal.title
     * @param {Number} goal.price
     * @returns {Promise<void>}
     */
    async syncGoal (goal) {
        const BudgetLogic = require('../../logic/budgets');

        // find transaction model
        let budgetModel = await BudgetLogic.getModel().findOne({
            where: {
                pluginInstanceId: this.id(),
                pluginsOwnId: goal.id
            }
        });

        // create new budget model if not already there
        if (!budgetModel) {
            budgetModel = await BudgetLogic.getModel().build({
                pluginInstanceId: this.id(),
                pluginsOwnId: goal.id,
                name: goal.title
            });
        }

        // if category not set: use the one other goals are already in
        if (!budgetModel.categoryId) {
            const bestMatch = await BudgetLogic.getModel().findOne({
                attributes: [
                    'categoryId',
                    [DatabaseHelper.count('*'), 'sum']
                ],
                where: {
                    pluginInstanceId: this.id()
                },
                group: 'categoryId',
                order: [[DatabaseHelper.literal('sum'), 'DESC']],
                raw: true
            });
            if (bestMatch) {
                budgetModel.categoryId = bestMatch.categoryId;
            }
        }

        // if category still not set: use the one other plugins used to save goals in
        if (!budgetModel.categoryId) {
            const bestMatch = await BudgetLogic.getModel().findOne({
                attributes: [
                    'categoryId',
                    [DatabaseHelper.count('*'), 'sum']
                ],
                include: [{
                    model: DatabaseHelper.get('category'),
                    attributes: [],
                    where: {
                        documentId: this.documentId()
                    }
                }],
                group: 'categoryId',
                order: [[DatabaseHelper.literal('sum'), 'DESC']],
                raw: true
            });
            if (bestMatch) {
                budgetModel.categoryId = bestMatch.categoryId;
            }
        }

        // if category still not set: use last category in document
        if (!budgetModel.categoryId) {
            const bestMatch = await DatabaseHelper.get('category').findOne({
                attributes: ['name', 'categoryId'],
                where: {
                    documentId: this.documentId()
                },
                order: [['name', 'DESC']],
                raw: true
            });
            if (bestMatch) {
                budgetModel.categoryId = bestMatch.categoryId;
            }
        }

        // if category still not set: create one
        if (!budgetModel.categoryId) {
            const newCategory = await DatabaseHelper.get('category').create({
                name: this.type(),
                documentId: this.documentId()
            });

            budgetModel.categoryId = newCategory.id;
        }

        budgetModel.goal = goal.price;

        try {
            await budgetModel.save();
        }
        catch (err) {
            log.error('Unable to sync goal: saving budget failed.\n\n' + JSON.stringify(budgetModel.dataValues));
            throw err;
        }
    }

    /**
     * Generates Configuration Key-Value Pair for request()
     * @param {object} [values]
     * @returns {object}
     */
    generateConfig (values) {
        // build temporary getConfig
        const config = {};
        values = values || {};

        (this._config || []).forEach(c => {
            config[c.id] = values[c.id] || c.value || c.defaultValue;
            if (config[c.id] === '{{email}}') {
                config[c.id] = null;
            }
        });

        return JSON.parse(JSON.stringify(config || {}));
    }


    /**
     * Destroys the pluginn instance
     * @returns {Promise.<void>}
     */
    async destroy () {

        // update status
        this._status = 3;
        this.emit('change:status', this.status());
        this._events.emit('update', {
            action: 'updated',
            name: 'plugin-instance',
            model: this
        });

        // stop cron
        if (this._cron) {
            clearInterval(this._cron);
            this._cron = null;
        }

        // wait till all plugin threads stopped
        await new Promise(resolve => {
            if (this.forks() === 0) {
                resolve();
            }

            this.once('change:forks', () => {
                resolve();
            });
        });

        // fire destroy event
        this.emit('destroy');
        this._events.emit('update', {
            action: 'deleted',
            name: 'plugin-instance',
            model: this
        });
    }


    /**
     * Method to execute a single request within a plugin
     * For this, a plugin runner is forked and the method
     * is forwared to the runner.
     *
     * @param {PluginInstance} [instance] Plugin Instance
     * @param {string} type plugin to use, for example `@dwimm/plugin-dummy`
     * @param {string} method method to run, for example `check`
     * @param {object} [config]
     * @param {object} [params]
     * @returns {Promise<object|void>}
     */
    static async request (instance, type, method, config, params) {
        /* eslint-disable security/detect-child-process */
        const fork = require('child_process').fork;
        /* eslint-enable security/detect-child-process */

        if (instance && instance._shutdown) {
            throw new Error('Instance is shutting down…');
        }
        if (instance) {
            instance._forks += 1;

            instance.emit('change:forks', instance._forks);
            instance._events.emit('update', {
                action: 'updated',
                name: 'plugin-instance',
                model: instance
            });
        }
        if (!method) {
            throw new Error('PluginInstance: called request() wthout method!');
        }

        const childProcess = fork(__dirname + '/runner.js', {
            cwd: require('os').tmpdir(),
            stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
            env: {
                PATH: process.env.PATH
            },
            execArgv: ''
        });

        childProcess.send({
            type,
            method,
            config: _.extend(config || {}),
            params: _.extend(params || {})
        });

        return new Promise((resolve, reject) => {
            let isRunning = true,
                stderr = [],
                stdout = [],
                responseArray,
                gotConfirm,
                gotResponse;

            childProcess.on('exit', () => {
                if (instance) {
                    instance._forks -= 1;
                    instance.emit('change:forks', instance._forks);
                }

                isRunning = false;

                if (gotResponse) {
                    if (instance) {
                        instance._events.emit('update', {
                            action: 'updated',
                            name: 'plugin-instance',
                            model: instance
                        });
                    }

                    return;
                }
                gotResponse = true;

                const text = (stderr.join('\n').trim() || stdout.join('\n').trim() || 'Plugin died')
                    .replace(/^Error:/, '')
                    .trim()
                    .split('\n').join(' ');

                if (instance) {
                    instance._errors[method] = text;
                    instance.emit('change:errors', instance._errors);
                    instance._events.emit('update', {
                        action: 'updated',
                        name: 'plugin-instance',
                        model: instance
                    });
                }

                reject(new Error(text));
            });
            childProcess.stdout.on('data', buffer => {
                log.debug('%s: stdout-> %s', type, buffer.toString().trim());
                stdout.push(buffer.toString());
            });
            childProcess.stderr.on('data', buffer => {
                log.debug('%s: stderr-> %s', type, buffer.toString().trim());
                stderr.push(buffer.toString());
            });
            childProcess.on('message', message => {
                if (!gotConfirm && message && message.type === 'confirm') {
                    gotConfirm = true;
                }
                else if (!gotResponse && message && message.type === 'item') {
                    responseArray = responseArray || [];
                    responseArray.push(message.item);
                }
                else if (!gotResponse && message && message.type === 'get' && message.key) {
                    this.requestHandlePluginGet(instance, childProcess, message.key).catch(err => {
                        childProcess.send({
                            method: 'get',
                            key: message.key,
                            error: err.stack || err.toString()
                        });

                        instance._errors[method] = 'Unable to get key `' + message.key + '`';
                        instance.emit('change:errors', instance._errors);
                        instance._events.emit('update', {
                            action: 'updated',
                            name: 'plugin-instance',
                            model: instance
                        });
                    });
                }
                else if (!gotResponse && message && message.type === 'set' && message.key) {
                    this.requestHandlePluginSet(instance, childProcess, message.key, message.value).catch(err => {
                        childProcess.send({
                            method: 'set',
                            key: message.key,
                            error: err.stack || err.toString()
                        });

                        instance._errors[method] = 'Unable to set key `' + message.key + '`';
                        instance.emit('change:errors', instance._errors);
                        instance._events.emit('update', {
                            action: 'updated',
                            name: 'plugin-instance',
                            model: instance
                        });
                    });
                }
                else if (!gotResponse && message && message.type === 'response') {
                    gotResponse = true;


                    setTimeout(() => {
                        if (isRunning) {
                            log.warn('%s: still alive, kill it', type);
                            childProcess.kill();
                        }
                    }, 1000 * 5);

                    if (instance) {
                        instance._errors[method] = null;
                        instance.emit('change:errors', instance._errors);
                        instance._events.emit('update', {
                            action: 'updated',
                            name: 'plugin-instance',
                            model: instance
                        });
                    }

                    resolve(responseArray || message.data || {});
                }
            });

            setTimeout(() => {
                if (!gotConfirm) {
                    log.error('%s: confirm timeout, kill it', type);
                    childProcess.kill();

                    if (instance) {
                        instance._errors[method] = 'Confirmation Timeout: Unable to communicate with plugin';
                        instance.emit('change:errors', instance._errors);
                        instance._events.emit('update', {
                            action: 'updated',
                            name: 'plugin-instance',
                            model: instance
                        });
                    }

                    reject(new Error('Unable to communicate with plugin'));
                }
            }, 1000 * 2);

            setTimeout(() => {
                if (!gotResponse) {
                    log.error('%s: response timeout, kill it', type);
                    childProcess.kill();

                    if (instance) {
                        instance._errors[method] = 'Response Timeout: Unable to communicate with plugin';
                        instance.emit('change:errors', instance._errors);
                        instance._events.emit('update', {
                            action: 'updated',
                            name: 'plugin-instance',
                            model: instance
                        });
                    }

                    reject(new Error('Unable to communicate with plugin'));
                }
            }, 1000 * 60 * 5);
        });
    }


    /**
     * Method which handles a store get request from the plugin
     *
     * @param {PluginInstance} [instance] Plugin Instance
     * @param {ChildProcess} childProcess Child Process of plugin
     * @param {string} key Requested key
     * @returns {Promise<object|null>}
     */
    static async requestHandlePluginGet (instance, childProcess, key) {
        if (!instance || !instance._model || !instance._model.id) {
            throw new Error('Unable to serve request: Plugin not called as plugin instance!');
        }

        const store = await DatabaseHelper.get('plugin-store').findOne({
            where: {
                pluginInstanceId: instance._model.id,
                key
            }
        });

        let value = null;
        try {
            value = JSON.parse(store.value);
        }
        catch (err) {
            // ignore
        }

        childProcess.send({
            method: 'get',
            key,
            value
        });
    }

    /**
     * Method which handles a store get request from the plugin
     *
     * @param {PluginInstance} [instance] Plugin Instance
     * @param {ChildProcess} childProcess Child Process of plugin
     * @param {string} key Key
     * @param {object} value New value
     * @returns {Promise<object|null>}
     */
    static async requestHandlePluginSet (instance, childProcess, key, value) {
        if (!instance || !instance._model || !instance._model.id) {
            throw new Error('Unable to serve request: Plugin not called as plugin instance!');
        }

        let store = await DatabaseHelper.get('plugin-store').findOne({
            where: {
                pluginInstanceId: instance._model.id,
                key
            }
        });
        if (!store) {
            store = DatabaseHelper.get('plugin-store').build();
            store.pluginInstanceId = instance._model.id;
            store.key = key;
        }

        store.value = JSON.stringify(value);

        try {
            store.save();

            childProcess.send({
                method: 'set',
                key
            });
        }
        catch (err) {
            childProcess.send({
                method: 'set',
                key,
                error: err.toString()
            });
        }
    }

    /**
     * Runs some basic checks on the plugin
     *
     * @param {string} type plugin to use, for example `@dwimm/plugin-dummy`
     * @returns {Promise.<void>}
     */
    static async check (type) {
        try {
            /* eslint-disable security/detect-non-literal-require */
            require(type + '/package.json');
            /* eslint-enable security/detect-non-literal-require */
        }
        catch (err) {
            throw new Error('Unable to parse plugin\'s package.json');
        }

        try {
            /* eslint-disable security/detect-non-literal-require */
            require(type + '/.dwimm-plugin.json');
            /* eslint-enable security/detect-non-literal-require */
        }
        catch (err) {
            throw new Error('Unable to parse plugin\'s .dwimm-plugin.json');
        }

        const response = await this.request(null, type, 'check');
        if (!response || !response.success) {
            throw new Error('Unexpected result: ' + JSON.stringify(response));
        }
    }
}

module.exports = PluginInstance;