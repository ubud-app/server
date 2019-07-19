'use strict';

const EventEmitter = require('events');
const LogHelper = require('./log');
const ConfigHelper = require('./config');
const DatabaseHelper = require('./database');
const PluginHelper = require('./plugin');
const log = new LogHelper('RepositoryHelper');

let events = new EventEmitter();
let initialized = false;
let instanceIdModel = null;
let repository = {
    components: {},
    plugins: null
};


/**
 * RepositoryHelper
 *
 * @module helpers/repository
 * @class RepositoryHelper
 */
class RepositoryHelper {
    static async initialize() {
        if (initialized) {
            return;
        }

        initialized = true;

        try {
            instanceIdModel = await DatabaseHelper.get('setting').findOne({
                where: {
                    key: 'id',
                    documentId: null
                }
            });
        }
        catch(err) {
            log.warn('Invalid id in settings: ignore id (%s)', err);
            instanceIdModel = null;
        }

        setTimeout(() => {this.run();}, 500);
    }

    /**
     * Run the _run() method and manage the timeout to
     * start it again in a while…
     */
    static run() {
        this._run()
            .then(() => {
                setTimeout(() => this.run(), 1000 * 60 * 60 * 3);
            })
            .catch(err => {
                log.error(err.toString());
                setTimeout(() => this.run(), 1000 * 60 * 5);
            });
    }

    /**
     * Calls the repository and beacon server with the required
     * fields and saves the answer in `lastResponse`. Also saves
     * the instance id in settings if required.
     */
    static async _run() {
        const request = require('request-promise-native');
        const payload = await this._payload();

        const res = await request({
            uri: 'https://api.repository.dwimm.org/v1/beacon',
            method: 'post',
            json: true,
            body: payload
        });

        if(res.id && instanceIdModel && instanceIdModel.value !== JSON.stringify(res.id)) {
            instanceIdModel.value = JSON.stringify(res.id);
            await instanceIdModel.save();
        }
        else if(res.id && !instanceIdModel) {
            instanceIdModel = await DatabaseHelper.get('setting').create({
                key: 'id',
                value: JSON.stringify(res.id),
                documentId: null
            });
        }
        else if(!res.id) {
            throw new Error('Invalid repository response: `id` missing!');
        }

        if(res.warn && res.warn.length) {
            res.warn.forEach(function(s) {
                log.warn('Got repository warning: %s', s);
            });
        }

        if(res.components) {
            repository.components = res.components;
            Object.entries(repository.components).forEach(([name, data]) => {
                DatabaseHelper.events().emit('update', {
                    action: 'updated',
                    name: 'component',
                    model: this.prettifyComponent(name, data)
                });
            });
        }
        if(res.plugins) {
            repository.plugins = res.plugins;
        }

        events.emit('sync');
    }

    /**
     * Prepares the payload to send with the request
     * @returns {Promise.<object>}
     */
    static async _payload() {
        const os = require('os');
        const exec = require('promised-exec');

        const data = {};

        data.id = instanceIdModel ? JSON.parse(instanceIdModel.value) : null;
        data.serverVersion = ConfigHelper.getVersion() || 'develop';
        data.clientVersion = ConfigHelper.getClient() ? ConfigHelper.getClient().version : null;
        data.npmVersion = await exec('npm -v');

        data.nodeVersion = await exec('node -v');
        if(data.nodeVersion.substr(0, 1) === 'v') {
            data.nodeVersion = data.nodeVersion.substr(1);
        }

        data.cpuType = os.arch();
        data.osType = os.platform();

        data.users = await DatabaseHelper.get('user').count();
        data.documents = await DatabaseHelper.get('document').count();

        // Usages
        const plugins = await PluginHelper.listPlugins();
        const usages = {};

        await Promise.all(
            plugins.map(async function(plugin) {
                usages[plugin.type()] = usages[plugin.type()] || {};
                usages[plugin.type()].type = plugin.type();
                usages[plugin.type()].version = plugin.version();

                usages[plugin.type()].accounts = usages[plugin.type()].accounts || 0;
                usages[plugin.type()].accounts = await DatabaseHelper.get('account').count({
                    where: {
                        pluginInstanceId: plugin.id()
                    }
                });

                usages[plugin.type()].goals = usages[plugin.type()].goals || 0;
                usages[plugin.type()].goals = await DatabaseHelper.get('budget').count({
                    where: {
                        pluginInstanceId: plugin.id()
                    }
                });
            })
        );

        data.usages = Object.keys(usages).map((k) => usages[k]);

        return data;
    }

    /**
     * Wait till Beacon Request is done.
     * @returns {Promise<void>}
     */
    static async wait() {
        await new Promise(resolve => {
            events.once('sync', () => {
                resolve();
            });
        });
    }

    /**
     * Filter plugins which matches the given filter.
     *
     * @param filter
     * @returns {Promise.<object|null>}
     */
    static async filterPluginByFilter(filter) {
        if(repository.plugins === null) {
            await this.wait();
        }
        if(repository.plugins === null) {
            return null;
        }

        return repository.plugins.filter(filter);
    }

    /**
     * Tries to find the given plugin by ID
     *
     * @param {string} id
     * @returns {Promise.<object|null>}
     */
    static async getPluginById(id) {
        const plugins = await this.filterPluginByFilter(plugin => plugin.id === id);
        if(plugins.length >= 1) {
            return plugins[0];
        }

        try {
            const request = require('request-promise-native');
            const payload = await this._payload();
            const plugin = await request({
                uri: 'https://api.repository.dwimm.org/v1/plugin',
                method: 'post',
                json: true,
                body: {
                    id: payload.id,
                    serverVersion: payload.serverVersion,
                    clientVersion: payload.clientVersion,
                    nodeVersion: payload.nodeVersion,
                    npmVersion: payload.npmVersion,
                    cpuType: payload.cpuType,
                    osType: payload.osType,
                    plugin: id
                }
            });

            return plugin;
        }
        catch(err) {
            log.warn(err.toString());
        }

        return null;
    }

    /**
     * Remotly search for an account plugin
     *
     * @param {string} q
     * @returns {Promise.<object|null>}
     */
    static async searchAccountPlugin (q) {
        const request = require('request-promise-native');
        const payload = await this._payload();

        return request({
            uri: 'https://api.repository.dwimm.org/v1/search',
            method: 'post',
            json: true,
            body: {
                id: payload.id,
                serverVersion: payload.serverVersion,
                clientVersion: payload.clientVersion,
                nodeVersion: payload.nodeVersion,
                npmVersion: payload.npmVersion,
                cpuType: payload.cpuType,
                osType: payload.osType,
                account: q
            }
        });
    }

    /**
     * Get Component
     *
     * @returns {Promise}
     */
    static async getComponents () {
        if(!repository.components.length) {
            await this.wait();
        }

        return Object.entries(repository.components).map(([name, data]) => {
            return this.prettifyComponent(name, data);
        });
    }

    /**
     * List all components
     *
     * @returns {Promise}
     */
    static async getComponent (id) {
        if(!repository.components.length) {
            await this.wait();
        }

        const c = repository.components[id];
        if(!c) {
            return false;
        }

        return this.prettifyComponent(id, c);
    }

    static prettifyComponent (name, data) {
        const j = {
            id: name,
            installed: null,
            available: null
        };

        if(name === 'server' && ConfigHelper.getVersion()) {
            j.installed = ConfigHelper.getVersion();
        }
        if(name === 'client' && ConfigHelper.getClient() && ConfigHelper.getClient().version) {
            j.installed = ConfigHelper.getClient().version;
        }

        j.available = data.channels[ConfigHelper.isNext() ? 'next' : 'latest'];
        return j;
    }
}


module.exports = RepositoryHelper;