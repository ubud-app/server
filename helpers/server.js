'use strict';

const socketio = require('socket.io');
const http = require('http');
const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');

const LogHelper = require('./log');
const ConfigHelper = require('./config');
const SocketSession = require('./socketSession');
const HTTPRequestHandler = require('./httpRequestHandler');
const SocketRequestHandler = require('./socketRequestHandler');
const DatabaseHelper = require('./database');
const RepositoryHelper = require('./repository');
const PluginHelper = require('./plugin');
const KeychainHelper = require('./keychain');
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
        app.use(express.json());
        app.use(fileUpload());
        app.use(cors());
        io = socketio(server);

        try {
            await this.waitForDatabase();
            await this.migrateDatabaseIfRequired();
            await this.createDefaultUserIfRequired();

            await RepositoryHelper.initialize();
            await PluginHelper.initialize();
        }
        catch (err) {
            log.fatal(err);
        }

        this.loadRoutes();
        this.serveUI();
        server.listen(ConfigHelper.getPort());

        io.on('connection', function (socket) {
            ServerHelper.handleSocketConnection(socket);
        });
    }

    /**
     * Tests the database connection and waits up to 30
     * seconds for a working connection. If sequelize is
     * unable to connect, this method will throw an error
     * after 30 seconds.
     *
     * @returns {Promise<void>}
     */
    static async waitForDatabase () {
        let lastError = null;
        for(let i = 0; i < 60; i++) {
            try {
                await DatabaseHelper.authenticate();
                return;
            }
            catch(error) {
                lastError = error;

                if(i === 0) {
                    log.info('Unable to establish database connection. Will try again for a moment, please wait…');
                }

                await new Promise(cb => setTimeout(cb, 1000));
            }
        }

        throw lastError;
    }

    /**
     * Loades the available logic routes and generates HTTP
     * routes for them. Also stores all routes in `allRoutes`
     * for later usage.
     */
    static loadRoutes () {
        const Logics = require('../logic');
        Logics.forEach(Logic => {
            allLogics[Logic.getModelName()] = Logic;
            Logic.getAvailableRoutes().forEach(route => {
                ServerHelper.addHTTPRoute(Logic, route);
            });
        });
    }

    /**
     * Tries to get the directory of ubud-client and serve it's
     * static files by our server. Woun't do anything in case
     * client is not installed within our scope…
     */
    static serveUI () {
        try {
            const web = ConfigHelper.getClient();

            if (web) {

                // static files
                app.use(express.static(web.static, {
                    etag: false,
                    maxage: 5 * 60 * 1000,
                    setHeaders: function (res) {
                        if (ConfigHelper.getClient() && ConfigHelper.getClient().timestamp) {
                            res.setHeader('Last-Modified', ConfigHelper.getClient().timestamp);
                        }
                        else {
                            res.removeHeader('Last-Modified');
                        }

                        let server = 'ubud Server';
                        if (ConfigHelper.getVersion()) {
                            server += ' ' + ConfigHelper.getVersion();
                        }
                        if (ConfigHelper.getClient()) {
                            server += ' with Client';
                        }
                        if (ConfigHelper.getClient() && ConfigHelper.getClient().version) {
                            server += ' ' + ConfigHelper.getClient().version;
                        }

                        res.setHeader('x-powered-by', server);
                    }
                }));

                // default language
                if (web.languages && Array.isArray(web.languages)) {
                    app.use((req, res) => {
                        const language = req.acceptsLanguages(web.languages) || 'en-US';
                        res.sendFile(`${web.static}/${language}/index.html`);
                    });
                }
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

        methods.forEach(method => {
            app[method](regex, (req, res) => {
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

        setTimeout(() => {
            socket.emit('hello');
        });
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
        const handleEvent = async event => {
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

            const model = await Logic.get(
                typeof event.model.id === 'function' ? event.model.id() : event.model.id,
                {session: session.getSessionModel()}
            );
            if (!model) {
                return null;
            }


            const json = await Logic.format(model, {}, {session: session.getSessionModel()});
            if (json) {
                socket.emit('update', {
                    action: event.action,
                    name: Logic.getPluralModelName(),
                    id: json.id,
                    data: json
                });
            }
        };

        DatabaseHelper.events().on('update', handleEvent);
        PluginHelper.events().on('update', handleEvent);

        KeychainHelper.events().on('unlocked', () => {
            if (session.getSessionModel()) {
                handleEvent({
                    action: 'updated',
                    name: 'user',
                    model: session.getSessionModel().user
                }).catch(error => {
                    log.error(error);
                });
            }
        });

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
    static async migrateDatabaseIfRequired () {
        try {
            const migrations = await DatabaseHelper.getMigrator().up();
            if (migrations.length > 0) {
                log.info('Executed %s migrations.\n - %s', migrations.length, migrations.map(m => m.file).join('\n - '));
            }
        }
        catch (e) {
            log.error(e);
            log.fatal(new Error('Unable to execute pending database transactions, stop server…'));
        }
    }

    /**
     * Creates a default user if required and
     * prints it's password.
     *
     * @returns {Promise}
     */
    static async createDefaultUserIfRequired () {
        const crypto = require('crypto');
        const bcrypt = require('bcryptjs');
        const user = DatabaseHelper.get('user');

        await user.destroy({
            where: {
                email: 'setup@ubud.club'
            }
        });

        const count = await user.count();
        if (count > 0) {
            return;
        }

        const password = await new Promise((resolve, reject) => {
            crypto.randomBytes(16, (err, buffer) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(buffer.toString('hex'));
                }
            });
        });

        const hash = await bcrypt.hash(password, 10);
        await DatabaseHelper.get('user').create({
            email: 'setup@ubud.club',
            password: hash,
            isAdmin: true,
            needsPasswordChange: true
        });

        let s = '\n\n\n##########################################\n\n';
        s += 'Hey buddy,\n\nI just created a new admin user for you. \nUse these credentials to login:\n\n';
        s += 'Email: setup@ubud.club\n';
        s += 'Password: ' + password + '\n\n';
        s += 'Cheers, \nyour lovely ubud server :)\n\n';
        s += '##########################################\n\n\n';

        log.info(s);
    }
}


module.exports = ServerHelper;
