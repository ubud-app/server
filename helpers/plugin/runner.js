'use strict';

const PluginTools = require('./tools.js');
module.exports = PluginTools;

/**
 * PluginRunner
 *
 * @class PluginRunner
 */
class PluginRunner {
    static async initialize() {
        process.title = 'dwimm-plugin';

        const job = await this.getJobDescription();
        process.title = 'dwimm-plugin (' + job.type + ')';
        PluginTools._config = job.config;

        /* eslint-disable security/detect-non-literal-require */
        job.plugin = require(job.type);
        /* eslint-enable security/detect-non-literal-require */

        if (job.method === 'check') {
            return this.check(job);
        }
        else if (job.method === 'getConfig') {
            return this.getConfig();
        }
        else if (job.method === 'validateConfig') {
            return this.validateConfig(job);
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
    static async getJobDescription() {
        return new Promise(cb => {
            process.on('message', job => {
                process.send({type: 'confirm'});
                cb(job);
            });
        });
    }

    /**
     * Sends the given data as plugin result.
     *
     * @param {object} data
     * @returns {Promise.<void>}
     */
    static async sendResponse(data) {
        process.send({type: 'response', data});
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
    static async check(job) {
        if (PluginTools._getConfig().length > 0 && typeof job.plugin.validateConfig !== 'function') {
            throw new Error('Plugin has getConfig, but validateConfig() is not a function!');
        }

        let methods = 0;
        ['getAccounts', 'getTransactions', 'getMetadata', 'getGoals'].forEach(method => {
            if(job.plugin[method] && typeof job.plugin[method] === 'function') {
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
     * Returns the configuration object for this instance.
     *
     * @returns {Promise.<object>}
     */
    static async getConfig() {
        return PluginTools._getConfig();
    }

    /**
     * Validates the given configuration data…
     *
     * @returns {Promise.<object[]>}
     */
    static async validateConfig(job) {
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
}

PluginRunner.initialize()
    .then(result => {
        return PluginRunner.sendResponse(result);
    })
    .then(() => {
        process.exit(0);
    })
    .catch(error => {
        console.log(error);
        process.exit(1);
    });