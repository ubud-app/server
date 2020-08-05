'use strict';
/* eslint-disable node/no-process-env */

const path = require('path');
const fs = require('fs');

let version;
let database;
let sentryDSN;
let ui;


// get version number
try {
    const packageJsonPath = path.resolve(__dirname, '..', 'package.json');

    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
    version = JSON.parse(packageJsonContent).version;
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
    sentryDSN = 'https://208216054c2642ccb41379ed01ceb395@sentry.sebbo.net/2';
}

// Client / UI
try {

    ui = require('@ubud-app/client'); // eslint-disable-line node/global-require, node/no-missing-require
    ui.static = path.resolve(ui.static);

    const packageJsonPath = path.resolve(ui.all + '/../package.json');
    const stats = fs.statSync(packageJsonPath); // eslint-disable-line security/detect-non-literal-fs-filename
    ui.timestamp = stats.mtime;

    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
    ui.version = JSON.parse(packageJsonContent).version;
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
