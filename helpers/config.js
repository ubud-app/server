'use strict';

let version;
let database;
let sentryDSN;
let ui;


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
    database = 'mysql://localhost/ubud';
}

// Sentry DSN
sentryDSN = process.env['SENTRY_DSN'];
if(sentryDSN === undefined) {
    sentryDSN = 'https://aeb063cd52664d62bcb7d3324e6e9e89:d3655f9062844f43944ff508822cb58f@sentry.sebbo.net/5';
}

// Client / UI
try {
    const path = require('path');
    const fs = require('fs');

    ui = require('@ubud-app/client-web');

    ui.static = path.resolve(ui.static);

    const packageJson = path.resolve(ui.all + '/../package.json');
    const stats = fs.statSync(packageJson);
    ui.timestamp = stats.mtime;

    ui.version = require(packageJson).version;  // eslint-disable-line security/detect-non-literal-require
}
catch(err) {
    // do nothing
}


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
    static getVersion() {
        return version;
    }

    /**
     * Returns the port the app server should bind to
     * @returns {Number}
     */
    static getPort() {
        return parseInt(process.env.PORT) || 8080;
    }

    /**
     * Returns the database connection URI set via the
     * `DATABASE` environment variable.
     * @returns {String}
     */
    static getDatabaseURI() {
        return database;
    }

    /**
     * Returns the Sentry DSN (Data Source Name) used to
     * remotely submit error messages.
     * @returns {String|null}
     */
    static getSentryDSN() {
        return sentryDSN || null;
    }

    /**
     * True, if app runs in development mode. Set `DEVELOP`
     * environment variable, to do so.
     * @returns {boolean}
     */
    static isDev() {
        return !!process.env.DEVELOP;
    }

    /**
     * Returns client paths if client is installed,
     * otherwise null.
     * @returns {object|null}
     */
    static getClient() {
        return ui;
    }

    /**
     * True, if app runs next channel instead of latest,
     * applies not for plugins.
     * @returns {boolean}
     */
    static isNext() {
        return !!process.env.NEXT;
    }
}

module.exports = ConfigHelper;