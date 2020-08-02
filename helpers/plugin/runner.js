'use strict';

const PluginTools = require('./tools.js');
module.exports = PluginTools;

/**
 * PluginRunner
 *
 * @class PluginRunner
 */
class PluginRunner {
    static async initialize () {
        process.title = 'ubud-plugin';

        const job = await this.getJobDescription();
        process.title = 'ubud-plugin (' + job.type + ')';
        PluginTools._runner = this;
        PluginTools._config = job.config;

        try {
            job.plugin = require(job.type); // eslint-disable-line security/detect-non-literal-require
        }
        catch(err) {
            err.message = 'Unable to execute plugin: ' + err.message;
            throw err;
        }

        if (job.method === 'check') {
            return this.check(job);
        }
        else if (job.method === 'getSupported') {
            return this.getSupported(job);
        }
        else if (job.method === 'getConfig') {
            return this.getConfig();
        }
        else if (job.method === 'validateConfig') {
            return this.validateConfig(job);
        }
        else if (job.method === 'getAccounts') {
            return this.getAccounts(job);
        }
        else if (job.method === 'getTransactions') {
            return this.getTransactions(job);
        }
        else if (job.method === 'getMetadata') {
            return this.getMetadata(job);
        }
        else if (job.method === 'getGoals') {
            return this.getGoals(job);
        }
        else {
            throw new Error('Unimplemented method: `' + job.method + '`');
        }
    }

    /**
     * Returns a promise which will resolve with the job description
     * when received.
     *
     * @returns {Promise.<object>}
     */
    static async getJobDescription () {
        return new Promise(cb => {
            const callback = job => {
                process.send({type: 'confirm'});
                process.removeListener('message', callback);
                cb(job);
            };

            process.on('message', callback);
        });
    }

    /**
     * Sends the given data as plugin result.
     *
     * @param {object} data
     * @returns {Promise.<void>}
     */
    static async sendResponse (data) {
        if (!Array.isArray(data)) {
            process.send({type: 'response', data});
            return;
        }

        data.forEach(item => {
            process.send({type: 'item', item});
        });

        if (Array.isArray(data)) {
            process.send({type: 'response', data: []});
            return;
        }
        process.send({type: 'response'});
    }

    /**
     * Checks some plugin basics to detect if this plugin is
     * usable or not. Will return {success: true} if everything
     * is fine, otherwise will throw an error to notify the
     * server instance.
     *
     * @param {object} job
     * @returns {Promise.<object>}
     */
    static async check (job) {
        if (PluginTools._getConfig().length > 0 && typeof job.plugin.validateConfig !== 'function') {
            throw new Error('Plugin has getConfig, but validateConfig() is not a function!');
        }

        let methods = 0;
        ['getAccounts', 'getTransactions', 'getMetadata', 'getGoals'].forEach(method => {
            if (job.plugin[method] && typeof job.plugin[method] === 'function') {
                methods += 1;
            }
            else if (job.plugin[method] && typeof job.plugin[method] !== 'function') {
                throw new Error('Plugin has invalid function ' + method + '()');
            }
        });
        if (!methods) {
            throw new Error('Plugin is not compatible!');
        }

        if (job.plugin.getAccounts && !job.plugin.getTransactions) {
            throw new Error('Plugin implemented getAccounts(), but getTransactions() is missing');
        }
        if (!job.plugin.getAccounts && job.plugin.getTransactions) {
            throw new Error('Plugin implemented getTransactions(), but getAccounts() is missing');
        }

        return {success: true};
    }

    /**
     * Returns a list of all supported methods this plugin implements
     *
     * @returns {Promise.<string[]>}
     */
    static async getSupported (job) {
        const supported = [];

        ['validateConfig', 'getAccounts', 'getTransactions', 'getMetadata', 'getGoals'].forEach(method => {
            if (job.plugin[method] && typeof job.plugin[method] === 'function') {
                supported.push(method);
            }
        });

        return supported;
    }

    /**
     * Returns the configuration object for this instance.
     *
     * @returns {Promise.<object>}
     */
    static async getConfig () {
        return PluginTools._getConfig();
    }

    /**
     * Returns the store object for this key.
     *
     * @returns {Promise.<object>}
     */
    static async getStoreValue (key) {
        return new Promise((resolve, reject) => {
            const callback = job => {
                if (job.method === 'get' && job.key === key) {
                    process.removeListener('message', callback);

                    if (job.value !== undefined) {
                        resolve(job.value);
                    } else {
                        reject(job.error);
                    }
                }
            };

            process.on('message', callback);
            process.send({type: 'get', key});
        });
    }

    /**
     * Sets the store value for this key.
     *
     * @returns {Promise.<object>}
     */
    static async setStoreValue (key, value) {
        return new Promise((resolve, reject) => {
            const callback = job => {
                if (job.method === 'set' && job.key === key) {
                    process.removeListener('message', callback);

                    if (!job.error) {
                        resolve();
                    } else {
                        reject(job.error);
                    }
                }
            };

            process.on('message', callback);
            process.send({type: 'set', key, value});
        });
    }

    /**
     * Validates the given configuration data…
     *
     * @returns {Promise.<object[]>}
     */
    static async validateConfig (job) {
        if (!job.plugin.validateConfig) {
            return {valid: true};
        }

        try {
            await job.plugin.validateConfig();
            return {valid: true};
        }
        catch (error) {
            if (error instanceof PluginTools.ConfigurationError) {
                return {valid: false, errors: [error.toJSON()]};
            }
            else if (error instanceof PluginTools.ConfigurationErrors) {
                return {valid: false, errors: error.toJSON()};
            }
            else {
                throw error;
            }
        }
    }

    /**
     * Get Accounts
     *
     * @param {object} job
     * @returns {Promise.<void>}
     */
    static async getAccounts (job) {
        const accounts = await job.plugin.getAccounts();
        return accounts.map(account => {
            if (!(account instanceof PluginTools.Account)) {
                throw new Error('Account has to be instance of PluginTools.Account!');
            }

            return account.toJSON();
        });
    }

    /**
     * Get Transactions
     *
     * @param {object} job
     * @returns {Promise.<void>}
     */
    static async getTransactions (job) {
        const moment = require('moment');
        const transactions = await job.plugin.getTransactions(
            job.params.accountId,
            moment(job.params.since)
        );

        return transactions.map(transaction => {
            if (!(transaction instanceof PluginTools.Transaction)) {
                throw new Error('Transaction has to be instance of PluginTools.Transaction!');
            }

            return transaction.toJSON();
        });
    }

    /**
     * Get Metadata
     *
     * @param {object} job
     * @returns {Promise.<void>}
     */
    static async getMetadata (job) {
        let metadata = await job.plugin.getMetadata(job.params);
        if (!Array.isArray(metadata)) {
            metadata = [metadata];
        }

        return metadata.map(m => {
            if (!(m instanceof PluginTools.Split || m instanceof PluginTools.Memo)) {
                throw new Error('Objects in metadata has to be instance of PluginTools.Split or PluginTools.Memo');
            }

            return m.toJSON();
        });
    }

    /**
     * Get Goals
     *
     * @param {object} job
     * @returns {Promise.<void>}
     */
    static async getGoals (job) {
        const goals = await job.plugin.getGoals();
        return goals.map(goal => {
            if (!(goal instanceof PluginTools.Goal)) {
                throw new Error('Goal has to be instance of PluginTools.Goal!');
            }

            return goal.toJSON();
        });
    }
}

PluginRunner.initialize()
    .then(result => {
        return PluginRunner.sendResponse(result);
    })
    .then(() => {
        process.exit(0); // eslint-disable-line no-process-exit
    })
    .catch(error => {
        console.log('Unexpected Error:', error);
        process.exit(1); // eslint-disable-line no-process-exit
    });
