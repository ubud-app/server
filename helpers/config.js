'use strict';

let version;
let database;
let sentryDSN;


// get version number
try {
	version = require('../package.json').version;
}
catch (err) {
	version = null;
}

// Database Connection URI
database = process.env['DATABASE'];
if (!database) {
	database = 'mysql://localhost/hmwimm';
}

// Sentry DSN
sentryDSN = process.env['SENTRY'];


/**
 * ConfigHelper
 *
 * @module helpers/config
 * @class ConfigHelper
 */
class ConfigHelper {
	/**
	 * Returns the app's version number from package.json
	 * @returns {String}
	 */
	static getVersion () {
		return version;
	}

	/**
	 * Returns the port the app server should bind to
	 * @returns {Number}
	 */
	static getPort () {
		return parseInt(process.env.PORT) || 8080;
	}

	/**
	 * Returns the database connection URI set via the
	 * `DATABASE` environment variable.
	 * @returns {String}
	 */
	static getDatabaseURI () {
		return database;
	}

	/**
	 * Returns the Sentry DSN (Data Source Name) used to
	 * remotely submit error messages.
	 * @returns {String|null}
	 */
	static getSentryDSN () {
		return sentryDSN || null;
	}

	/**
	 * True, if app runs in development mode. Set `DEVELOP`
	 * environment variable, to do so.
	 * @returns {boolean}
	 */
	static isDev () {
		return !!process.env.DEVELOP;
	}
}

module.exports = ConfigHelper;