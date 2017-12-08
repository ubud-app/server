'use strict';

const LogHelper = require('../log');
const log = new LogHelper('PluginHelper');
const status = ['initializing', 'configuration', 'ready', 'waiting'];

/**
 * PluginInstance
 *
 * @class PluginInstance
 */
class PluginInstance {
    constructor(model) {
        this.model = model;
        this.status = 0;
        log.debug('Initialize Plugin %s', model.id);
    }


    id() {
        return this.model.id;
    }

    type() {
        return this.model.type;
    }

    documentId() {
        return this.model.documentId;
    }

    status() {
        return status[this.status];
    }


    /**
     * Method to execute a single request within a plugin
     * For this, a plugin runner is forked and the method
     * is forwared to the runner.
     *
     * @param {string} type plugin to use, for example `@dwimm/plugin-dummy`
     * @param {string} method method to run, for example `check`
     * @param {object} [params]
     * @returns {Promise<object|void>}
     */
    static async request(type, method, params) {
        const fork = require('child_process').fork;
        const process = fork(__dirname + '/runner.js', {
            cwd: require('os').tmpdir(),
            stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
            execArgv: ''
        });

        process.send({
            type,
            method,
            params: params || {}
        });
        log.debug('%s: sent request', type);

        return new Promise((resolve, reject) => {
            let isRunning,
                stderr = [],
                stdout = [],
                gotConfirm,
                gotResponse;

            process.on('exit', () => {
                log.debug('%s: killed itself', type);
                isRunning = false;
                gotResponse = true;
                reject(
                    new Error(
                        (stderr.join('\n').trim() || stdout.join('\n').trim() || 'Plugin died')
                            .replace(/^Error:/, '')
                            .trim()
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
                    log.debug('%s: got confirmation', type);
                }
                if (!gotResponse && message && message.type === 'response') {
                    gotResponse = true;
                    log.debug('%s: got response', type);


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
            }, 1000 * 10);

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
        return this.request(type, 'check')
            .then(response => {
                if(response && response.success) {
                    return Promise.resolve();
                }else{
                    throw new Error('Unexpected result: ' + JSON.stringify(response));
                }
            })
            .catch(err => {
                throw err;
            });
    }
}

module.exports = PluginInstance;