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
	static initialize () {
		if (app) {
			return;
		}

		app = express();
		server = http.Server(app);
		app.use(bodyParser.json());
		io = socketio(server);

		this.loadRoutes();
		server.listen(ConfigHelper.getPort());

		this.createDefaultUserIfRequired();

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
		fs.readdirSync(__dirname + '/../logic').forEach(function (dir) {
			if (dir.substr(0, 1) === '_') {
				return;
			}

			const Logic = require(__dirname + '/../logic/' + dir);
			allLogics[Logic.getModelName()] = Logic;

			Logic.getAvailableRoutes().forEach(route => {
				ServerHelper.addHTTPRoute(Logic, route);
			});
		});
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

		Object.entries(allLogics).forEach(([k, Logic]) => {
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
				log.error(new Error('Unknown Logic `' + event.name + '`!'));
				return;
			}
			if(!session.isAuthenticated()) {
				return;
			}

			const Logic = allLogics[event.name];

			if(event.action === 'deleted') {
				socket.emit('update', {
					action: event.action,
					name: Logic.getPluralModelName(),
					id: event.model.id
				});
				return;
			}

			Logic.get(event.model.id, {session: session.getSessionModel()})
				.then(model => {return Logic.format(model, {}, {session: session.getSessionModel()})})
				.then(function (json) {
					socket.emit('update', {
						action: event.action,
						name: Logic.getPluralModelName(),
						id: event.model.id,
						data: json
					});
				})
				.catch(err => {
					log.error(err);
				});
		};

		DatabaseHelper.events().on('update', handleEvent);
		socket.once('disconnecting', function () {
			DatabaseHelper.events().removeListener('update', handleEvent);
		});
		socket.once('error', function (err) {
			log.warn(err);
		});
	}

	/**
	 * Creates a default user if required and
	 * prints it's password.
	 */
	static createDefaultUserIfRequired () {
		const crypto = require('crypto');
		const bcrypt = require('bcrypt');
		const user = DatabaseHelper.get('user');
		let password;

		user.destroy({where: {email: 'setup@dwimm.org'}})
			.then(function() {
				return user.count();
			})
			.then(function(count) {
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
			.then(function() {
				let s = '\n\n\n##########################################\n\n';
				s += 'Hey buddy,\n\nI just created a new admin user for you. \nUse these credentials to login:\n\n';
				s += 'Email: setup@dwimm.org\n';
				s += 'Password: ' + password + '\n\n';
				s += 'Cheers, \nyour lovely HMWIMM server :)\n\n';
				s += '##########################################\n\n\n';

				log.info(s);
			})
			.catch(function (err) {
				if (err !== false) {
					throw err;
				}
			});
	}
}


module.exports = ServerHelper;