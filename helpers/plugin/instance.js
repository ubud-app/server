'use strict';

const _ = require('underscore');
const LogHelper = require('../log');
const EventEmitter = require('events');
const DatabaseHelper = require('../database');
const log = new LogHelper('PluginHelper');
const status = ['initializing', 'configuration', 'ready', 'waiting'];

/**
 * PluginInstance
 *
 * @class PluginInstance
 */
class PluginInstance extends EventEmitter {
    constructor(model) {
        super();

        this._model = model;
        this._status = 0;
        this._forks = 0;
        this._config = null;
        this._version = null;

        this._initialize()
            .catch(err => {
                log.error(err);
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
    async _initialize() {
        log.debug('Initialize Plugin %s', this._model.id);

        try {
            /* eslint-disable security/detect-non-literal-require */
            this._version = require(this._model.type + '/package.json').version;
            /* eslint-enable security/detect-non-literal-require */
        }
        catch (err) {
            log.warn('Unable to get version of plugin %s: %s', this._model.type, err);
        }

        // get configuration from database
        const dbConfigs = await DatabaseHelper.get('plugin-config').findAll({
            where: {
                pluginInstanceId: this._model.id
            }
        });

        // models -> plain object
        const plainConfigs = {};
        dbConfigs.forEach(config => {
            try {
                plainConfigs[config.key] = JSON.parse(config.value);
            }
            catch (err) {
                log.warn('Unable to parse getConfig `%s` for plugin %s: %s', config.key, this.id(), err);
            }
        });

        // ask plugin for configuration
        const config = await PluginInstance.request(this, this.type(), 'getConfig', plainConfigs);

        // delete unused configs in database
        dbConfigs.forEach(configModel => {
            if (!config.find(config => config.id === configModel.key)) {
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
            if (!config.value && config.defaultValue) {
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

        this.emit('change:getConfig');
        this.emit('initialized');
    }


    /**
     * Get the instance id of this plugin
     * @returns {string}
     */
    id() {
        return this._model.id;
    }

    /**
     * Get the type identifier of this plugin, this
     * mostly equals to the npm package name.
     *
     * @example "@dwimm/package-dummy"
     * @returns {string}
     */
    type() {
        return this._model.type;
    }

    /**
     * Returns the document id of the document this
     * plugin is associated to.
     * @returns {string}
     */
    documentId() {
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
    status(numeric) {
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
    forks() {
        return this._forks || 0;
    }

    /**
     * Returns the sequelize model for this instance.
     * @returns {Sequelize.Model}
     */
    model() {
        return this._model;
    }

    /**
     * Returns a promise which gives you the current
     * configuration data for this plugin. As this is
     * intended to be given to the client, all secrets
     * (passwords) are hidden.
     *
     * @returns {Promise<object[]>}
     */
    async config() {
        if (this._config === null) {
            return new Promise(resolve => {
                this.once('change:getConfig', () => {
                    resolve(this.config());
                });
            });
        }

        return this._config.slice(0).map(field => {
            if (field.type === 'password' && field.value) {
                field.value = '**********';
            }

            return field;
        });
    }

    version() {
        return this._version;
    }

    /**
     * Returns a json ready to serve to the client…
     *
     * @returns {Promise.<object>}
     */
    async toJSON() {
        const config = await this.config();
        return {
            id: this.id(),
            type: this.type(),
            version: this.version(),
            documentId: this.documentId(),
            status: this.status(),
            forks: this.forks(),
            config: config.map(c => {
                delete c.model;
                return c;
            })
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
    async checkAndSaveConfig(values) {

        // build temporary getConfig
        const config = {};
        this._config.forEach(c => {
            config[c.key] = c.value;
        });

        // extend with given config
        _.extend(config, values);

        // check configuration with plugin
        const validation = await PluginInstance.request(this, this.type(), 'validateConfig', config);

        // persistent configuration if valid
        if (validation.valid) {
            await Promise.all(this._config.map(config => {
                config.model.value = JSON.stringify(config.value);
                if (config.model.value.length > 255) {
                    throw new Error('Plugin `' + this._model.id + '`: Value for key `' + config.id + '` is too long!');
                }

                return config.model.save();
            }));
        }

        // update error codes
        this._config.forEach(config => {
            const error = (validation.errors || []).find(error => config.id === error.field);
            config.lastError = error ? error.code : null;
        });
        this.emit('change:config');

        // set this._status
        this._status = validation.valid ? 2 : 1;
        this.emit('change:status');

        // return result
        return validation.errors || [];
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

    static async request(instance, type, method, config, params) {
        /* eslint-disable security/detect-child-process */
        const fork = require('child_process').fork;
        /* eslint-enable security/detect-child-process */

        if (instance) {
            instance._forks += 1;
            instance.emit('change:forks', instance._forks);
        }
        if (!method) {
            console.log(new Error());
        }

        const process = fork(__dirname + '/runner.js', {
            cwd: require('os').tmpdir(),
            stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
            execArgv: ''
        });

        process.send({
            type,
            method,
            config: config || {},
            params: params || {}
        });

        return new Promise((resolve, reject) => {
            let isRunning = true,
                stderr = [],
                stdout = [],
                gotConfirm,
                gotResponse;

            process.on('exit', () => {
                if (instance) {
                    instance._forks -= 1;
                    instance.emit('change:forks', instance._forks);
                }

                isRunning = false;
                gotResponse = true;

                reject(
                    new Error(
                        (stderr.join('\n').trim() || stdout.join('\n').trim() || 'Plugin died')
                            .replace(/^Error:/, '')
                            .trim()
                            .split('\n')[0]
                    )
                );
            });
            process.stdout.on('data', buffer => {
                log.debug('%s: stdout-> %s', type, buffer.toString().trim());
                stdout.push(buffer.toString());
            });
            process.stderr.on('data', buffer => {
                log.debug('%s: stderr-> %s', type, buffer.toString().trim());
                stderr.push(buffer.toString());
            });
            process.on('message', message => {
                if (!gotConfirm && message && message.type === 'confirm') {
                    gotConfirm = true;
                }
                if (!gotResponse && message && message.type === 'response') {
                    gotResponse = true;


                    setTimeout(() => {
                        if (isRunning) {
                            log.warn('%s: still alive, kill it', type);
                            process.kill();
                        }
                    }, 1000 * 5);

                    resolve(message.data || {});
                }
            });

            setTimeout(() => {
                if (!gotConfirm) {
                    log.error('%s: confirm timeout, kill it', type);
                    process.kill();

                    reject(new Error('Unable to communicate with plugin'));
                }
            }, 1000 * 2);

            setTimeout(() => {
                if (!gotResponse) {
                    log.error('%s: response timeout, kill it', type);
                    process.kill();

                    reject(new Error('Unable to communicate with plugin'));
                }
            }, 1000 * 60 * 5);
        });
    }

    /**
     * Runs some basic checks on the plugin
     *
     * @param {string} type plugin to use, for example `@dwimm/plugin-dummy`
     * @returns {Promise.<void>}
     */
    static async check(type) {
        const response = await this.request(null, type, 'check');
        if (!response || !response.success) {
            throw new Error('Unexpected result: ' + JSON.stringify(response));
        }
    }
}

module.exports = PluginInstance;