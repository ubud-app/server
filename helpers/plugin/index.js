'use strict';

const EventEmitter = require('events');
const LogHelper = require('../log');
const DatabaseHelper = require('../database');
const PluginInstance = require('./instance');
const log = new LogHelper('PluginHelper');


const pluginEvents = new EventEmitter();
let initialized = false;
let plugins = [];


/**
 * PluginHelper
 *
 * @module helpers/plugin
 * @class PluginHelper
 */
class PluginHelper {
    static async initialize () {
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

        plugins = models.map(plugin => new PluginInstance(plugin, pluginEvents));
    }

    static async listPlugins () {
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
    static async installPlugin (type, document, options) {
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
            try {
                await this._runPackageRemove(type);
                log.debug('%s: removed successfully', type);
            }
            catch (err) {
                log.warn('%s: unable to remove plugin: %s', type, err);
                throw err;
            }
        }


        /*
         *  add instance to database
         */
        const model = await DatabaseHelper.get('plugin-instance').create({type, documentId: document.id});
        if (options.dontLoad) {
            return null;
        }

        const instance = new PluginInstance(model, pluginEvents);
        plugins.push(instance);

        return instance;
    }


    /**
     * removePlugin()
     *
     * @param {PluginInstance} instance
     * @returns {Promise.<void>}
     */
    static async removePlugin (instance) {
        // stop plugin
        await instance.destroy();

        // destroy database model
        await instance.model().destroy();

        // remove plugin from index
        const i = plugins.indexOf(instance);
        if (i !== -1) {
            plugins.splice(i, 1);
        }

        // get package usages by other plugin instances
        const usages = await DatabaseHelper.get('plugin-instance').count({
            where: {
                type: instance.type()
            }
        });

        // remove package if not used anymore
        if (!usages) {
            await this._runPackageRemove(instance.type());
        }
    }


    /**
     * Returns the event object used to transmit all
     * plugin events to our sockets…
     *
     * @returns {EventEmitter}
     */
    static events () {
        return pluginEvents;
    }


    static async _runPackageInstall (type) {
        const exec = require('promised-exec');
        const escape = require('shell-escape');
        let res;

        if (!this._runPackageInstall.running) {
            this._runPackageInstall.running = {};
        }
        if (this._runPackageInstall.running[type]) {
            log.debug('_runPackageInstall: Plugin %s installation running, wait for that…', type);

            await new Promise((resolve, reject) => {
                this._runPackageInstall.running[type].once('result', (error, result) => {
                    if (error) {
                        reject(error);
                    }
                    else {
                        resolve(result);
                    }
                });
            });
            return;
        }

        this._runPackageInstall.running[type] = new EventEmitter();

        try {
            res = await exec(escape(['npm', 'install', type, '--no-save']));
        }
        catch (err) {
            const e = new Error('Unable to install required package via npm`: ' + err.string);
            log.error(err.string);
            this._runPackageInstall.running[type].emit('result', [e, null]);
            this._runPackageInstall.running[type] = null;
            throw e;
        }

        const id = res.split('\n').find(l => l.trim().substr(0, 1) === '+');
        if (!id) {
            const e = new Error(`Plugin installed, but unable to get plugin name. Output was \`${res}\'`);
            this._runPackageInstall.running[type].emit('result', [e, null]);
            this._runPackageInstall.running[type] = null;
            throw e;
        }

        const result = id.substr(2, id.lastIndexOf('@') - 2).trim();
        this._runPackageInstall.running[type].emit('result', [null, result]);
        this._runPackageInstall.running[type] = null;
        return result;
    }

    static async _runPackageRemove (type) {
        const exec = require('promised-exec');
        const escape = require('shell-escape');

        await exec(escape(['npm', 'remove', type, '--save']));
    }
}


module.exports = PluginHelper;