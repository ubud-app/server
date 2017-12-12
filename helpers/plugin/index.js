'use strict';

const LogHelper = require('../log');
const DatabaseHelper = require('../database');
const PluginInstance = require('./instance');
const log = new LogHelper('PluginHelper');

let initialized = false;
let plugins = [];


/**
 * PluginHelper
 *
 * @module helpers/plugin
 * @class PluginHelper
 */
class PluginHelper {
    static async initialize() {
        if (initialized) {
            return;
        }

        let models;
        initialized = true;

        try {
            models = await DatabaseHelper.get('plugin-instance').findAll();
        }
        catch (err) {
            log.fatal('Unable to fetch used plugins: %s', err);
            throw err;
        }

        plugins = models.map(plugin => new PluginInstance(plugin));
    }

    static async listPlugins() {
        return plugins;
    }

    /**
     * installPlugin()
     *
     * Installs the given plugin for the selected document. For type, all parameters
     * specified for `npm install` are valid (see https://docs.npmjs.com/cli/install).
     *
     *
     * ### Sequence
     *
     * - run npm install
     *    - Fails: error
     *
     * - check plugin basics
     *    - Fails: uninstall plugin + error
     *
     * - add plugin to database
     *    - Fails: error
     *
     * - add plugin to ram db
     *
     * - check plugin configuration
     *    - Fails: uninstall plugin + error
     *    - Valid: go to ready state
     *    - Invalid: go to waiting for configuration state
     *
     * @param {string} type Plugin type, for example "@dwimm/plugin-n26" or "~/my-plugin"
     * @param {Sequelize.Model} document
     * @param {object} [options]
     * @param {boolean} [options.dontLoad] Don't load plugin instance. Method will return null then.
     * @returns {Promise.<PluginInstance>}
     */
    static async installPlugin(type, document, options) {
        options = options || {};

        /*
         *  npm install
         */
        try {
            type = await this._runPackageInstall(type);
            log.debug('%s: installed successfully', type);
        }
        catch (err) {
            throw err;
        }


        /*
         *  run plugin checks
         */
        try {
            await PluginInstance.check(type);
            log.debug('%s: checks passed', type);
        }
        catch (err) {

            // remove plugin again
            // @todo only if not used otherwise
            await this._runPackageRemove(type)
                .then(() => {
                    log.debug('%s: removed successfully', type);
                })
                .catch(err => {
                    log.warn('%s: unable to remove plugin: %s', type, err);
                });

            throw err;
        }


        /*
         *  add instance to database
         */
        const model = await DatabaseHelper.get('plugin-instance').create({type, documentId: document.id});
        if(options.dontLoad) {
            return null;
        }

        const instance = new PluginInstance(model);
        plugins.push(instance);

        return instance;
    }


    /**
     * removePlugin()
     *
     * @param {PluginInstance} instance
     * @returns {Promise.<void>}
     */
    static async removePlugin(instance) {

        // destroy database model
        await instance.model().destroy();

        // wait till all plugin threads stopped
        await new Promise(resolve => {
            if(instance.forks() === 0) {
                resolve();
            }

            instance.once('change:forks', () => {
                resolve();
            });
        });

        // remove plugin from index
        const i = plugins.indexOf(instance);
        if(i !== -1) {
            plugins.splice(i, 1);
        }

        // get package usages by other plugin instances
        const usages = await DatabaseHelper.get('plugin-instance').count({
            where: {
                type: instance.type()
            }
        });

        // remove package if not used anymore
        if(!usages) {
            await this._runPackageRemove(instance.type());
        }
    }

    static async _runPackageInstall(type) {
        const exec = require('promised-exec');
        const escape = require('shell-escape');

        return exec(escape(['npm', 'install', type, '--no-save']))
            .then(res => {
                const id = res.split('\n').find(l => l.trim().substr(0, 1) === '+');

                if (!id) {
                    throw new Error('Plugin installed, but unable to get plugin name. Output was `%s`', res);
                }

                return id.substr(2, id.lastIndexOf('@') - 2).trim();
            })
            .catch(e => {
                log.error(e.string);
                throw new Error('Unable to install required package via npm`: ' + e.string);
            });
    }

    static async _runPackageRemove(type) {
        const exec = require('promised-exec');
        const escape = require('shell-escape');

        return exec(escape(['npm', 'remove', type]))
            .then(() => {
                return Promise.resolve();
            })
            .catch(e => {
                throw e;
            });
    }
}


module.exports = PluginHelper;