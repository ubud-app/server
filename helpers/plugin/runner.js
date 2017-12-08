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
        const job = await this.getJobDescription();

        if(job.method === 'check') {
            return this.check(job);
        }
    }

    static async getJobDescription() {
        return new Promise(cb => {
            process.on('message', job => {
                process.send({type: 'confirm'});
                cb(job);
            });
        });
    }

    static async sendResponse(data) {
        process.send({type: 'response', data});
    }

    static async check(job) {
        /* eslint-disable security/detect-non-literal-require */
        const plugin = require(job.type);
        /* eslint-enable security/detect-non-literal-require */

        if(PluginTools.getConfig().length > 0 && typeof plugin.validateConfig !== 'function') {
            throw new Error('Plugin has config, but validateConfig() is not a function!');
        }

        ['getAccounts', 'getTransactions', 'getMetadata', 'getGoals'].forEach(method => {
            if(plugin[method] && typeof plugin[method] !== 'function') {
                throw new Error('Plugin has invalid function ' + method + '()');
            }
        });

        if(plugin.getAccounts && !plugin.getTransactions) {
            throw new Error('Plugin implemented getAccounts(), but getTransactions() is missing');
        }
        if(!plugin.getAccounts && plugin.getTransactions) {
            throw new Error('Plugin implemented getTransactions(), but getAccounts() is missing');
        }

        return this.sendResponse({success: true});
    }
}

PluginRunner.initialize().catch(error => {
    console.log(error);
    process.exit(1);
});