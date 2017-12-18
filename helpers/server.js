'use strict';

const socketio = require('socket.io');
const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');

const LogHelper = require('./log');
const ConfigHelper = require('./config');
const SocketSession = require('./socketSession');
const HTTPRequestHandler = require('./httpRequestHandler');
const SocketRequestHandler = require('./socketRequestHandler');
const DatabaseHelper = require('./database');
const RepositoryHelper = require('./repository');
const PluginHelper = require('./plugin');
const log = new LogHelper('ServerHelper');

const allLogics = {};
const allMethods = {
    'create': ['post'],
    'get': ['get'],
    'list': ['get'],
    'update': ['put', 'patch'],
    'delete': ['delete']
};

let io;
let app;
let server;


/**
 * ServerHelper
 *
 * @module helpers/server
 * @class ServerHelper
 */
class ServerHelper {
    /**
     * Initializes socket.io and the web server…
     */
    static async initialize () {
        if (app) {
            return;
        }

        app = express();
        server = http.Server(app);
        app.use(bodyParser.json());
        io = socketio(server);

        try {
            await this.migrateDatabaseIfRequired();
            await this.createDefaultUserIfRequired();

            await RepositoryHelper.initialize();
            await PluginHelper.initialize();
        }
        catch (err) {
            log.error(err);
            throw err;
        }

        this.loadRoutes();
        this.serveUI();
        server.listen(ConfigHelper.getPort());

        io.on('connection', function (socket) {
            ServerHelper.handleSocketConnection(socket);
        });
    }

    /**
     * Loades the available logic routes and generates HTTP
     * routes for them. Also stores all routes in `allRoutes`
     * for later usage.
     *
     * @todo Currently this method works sync, but it should make no difference to run this asynchronously, right?
     */
    static loadRoutes () {
        const fs = require('fs');

        /* eslint-disable security/detect-non-literal-fs-filename */
        fs.readdirSync(__dirname + '/../logic').forEach(function (dir) {
            /* eslint-enable security/detect-non-literal-fs-filename */
            if (dir.substr(0, 1) === '_') {
                return;
            }

            /* eslint-disable security/detect-non-literal-require */
            const Logic = require(__dirname + '/../logic/' + dir);
            /* eslint-enable security/detect-non-literal-require */

            allLogics[Logic.getModelName()] = Logic;

            Logic.getAvailableRoutes().forEach(route => {
                ServerHelper.addHTTPRoute(Logic, route);
            });
        });
    }

    /**
     * Tries to get the directory of dwimm-client and serve it's
     * static files by our server. Woun't do anything in case
     * client-web is not installed within our scope…
     */
    static serveUI () {
        try {
            const web = ConfigHelper.getClient();

            if (web) {

                // static files
                app.use(express.static(web.static));

                // default route
                app.use(function (req, res) {
                    res.sendFile(web.static + '/index.html');
                });
            }
        }
        catch (err) {
            const msg = err.toString().replace('Error:', '').trim();
            log.warn('Unable to serve UI: %s', msg);
        }
    }

    /**
     * Adds a single HTTP Route by passing an Logic
     * Object and the route to build.
     *
     * @param {Logic} Logic Logic Object
     * @param {String} route One of 'create', 'get', 'list', 'update' or 'delete'
     */
    static addHTTPRoute (Logic, route) {
        const methods = allMethods[route];
        const regex = Logic.getPathForRoute(route);

        methods.forEach(function (method) {
            app[method](regex, function (req, res) {
                new HTTPRequestHandler({Logic, route, req, res}).run();
            });
        });
    }

    /**
     * Handles new socket connections
     * @param {Socket} socket socket.io Socket Object
     */
    static handleSocketConnection (socket) {
        const session = new SocketSession();
        this.setupSocketRoutes(socket, session);
        this.setupSocketUpdateEvents(socket, session);
    }

    /**
     * Registers the required event listeners for new
     * sockets to handle basic CRUD operations.
     *
     * @param {Socket} socket socket.io Socket Object
     * @param {SocketSession} session
     */
    static setupSocketRoutes (socket, session) {
        socket.on('auth', function (data, cb) {
            session.authenticate(data).then(function () {
                cb({});
            }).catch(err => {
                log.warn(err);
                new SocketRequestHandler({session, data, cb}).error(err);
            });
        });

        Object.entries(allLogics).forEach(([, Logic]) => {
            Logic.getAvailableRoutes().forEach(route => {
                socket.on(Logic.getPluralModelName() + '/' + route, function (data, cb) {
                    new SocketRequestHandler({Logic, route, session, data, cb}).run();
                });
            });
        });
    }

    /**
     * Registers the required event listeners for new
     * sockets to handle model change events.
     *
     * @param {Socket} socket socket.io Socket Object
     * @param {SocketSession} session
     */
    static setupSocketUpdateEvents (socket, session) {
        const handleEvent = function (event) {
            if (!event.name || !allLogics[event.name]) {
                log.warn('Unknown Logic `' + event.name + '`!');
                return;
            }
            if (!session.isAuthenticated()) {
                return;
            }

            const Logic = allLogics[event.name];

            if (event.action === 'deleted') {
                socket.emit('update', {
                    action: event.action,
                    name: Logic.getPluralModelName(),
                    id: event.model.id
                });
                return;
            }
            if (!Logic.get) {
                return;
            }

            Logic.get(typeof event.model.id === 'function' ? event.model.id() : event.model.id, {
                    session: session.getSessionModel()
                })
                .then(model => {
                    return Logic.format(model, {}, {session: session.getSessionModel()});
                })
                .then(function (json) {
                    socket.emit('update', {
                        action: event.action,
                        name: Logic.getPluralModelName(),
                        id: json.id,
                        data: json
                    });
                })
                .catch(err => {
                    log.error(err);
                });
        };

        DatabaseHelper.events().on('update', handleEvent);
        PluginHelper.events().on('update', handleEvent);

        socket.once('disconnecting', function () {
            DatabaseHelper.events().removeListener('update', handleEvent);
        });
        socket.once('error', function (err) {
            log.warn(err);
        });
    }

    /**
     * Checks the database for pending migrations
     * and runs them…
     *
     * @returns {Promise}
     */
    static migrateDatabaseIfRequired () {
        return DatabaseHelper.getMigrator().up()
            .then(migrations => {
                if (migrations.length > 0) {
                    log.info('Executed %s migrations.\n - %s', migrations.length, migrations.map(m => m.file).join('\n - '));
                }

                return Promise.resolve();
            })
            .catch(e => {
                log.error(e);
                log.error(new Error('Unable to execute pending database transactions, stop server…'));
                process.exit(1);
            });
    }

    /**
     * Creates a default user if required and
     * prints it's password.
     *
     * @returns {Promise}
     */
    static createDefaultUserIfRequired () {
        const crypto = require('crypto');
        const bcrypt = require('bcrypt');
        const user = DatabaseHelper.get('user');
        let password;

        return user.destroy({where: {email: 'setup@dwimm.org'}})
            .then(function () {
                return user.count();
            })
            .then(function (count) {
                if (count > 0) {
                    throw false; // -> "abort promise"
                }

                return new Promise((resolve, reject) => {
                    crypto.randomBytes(16, (err, buffer) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(buffer.toString('hex'));
                        }
                    });
                });
            })
            .then(function (random) {
                password = random;
                return bcrypt.hash(random, 10);
            })
            .then(function (hash) {
                return DatabaseHelper.get('user').create({
                    email: 'setup@dwimm.org',
                    password: hash,
                    isAdmin: true,
                    needsPasswordChange: true
                });
            })
            .then(function () {
                let s = '\n\n\n##########################################\n\n';
                s += 'Hey buddy,\n\nI just created a new admin user for you. \nUse these credentials to login:\n\n';
                s += 'Email: setup@dwimm.org\n';
                s += 'Password: ' + password + '\n\n';
                s += 'Cheers, \nyour lovely DWIMM server :)\n\n';
                s += '##########################################\n\n\n';

                log.info(s);
                return Promise.resolve();
            })
            .catch(function (err) {
                if (err !== false) {
                    throw err;
                }
            });
    }
}


module.exports = ServerHelper;