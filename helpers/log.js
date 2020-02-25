'use strict';

const bunyan = require('bunyan');
const Sentry = require('@sentry/node');
const _ = require('underscore');
const os = require('os');
const util = require('util');
const http = require('http');
const {v4: uuid} = require('uuid');
const ConfigHelper = require('./config');

// bunyan logger
const logger = bunyan.createLogger({
    name: 'ubud-server',
    level: 'trace',
    serializers: {req: bunyan.stdSerializers.req}
});

const globalTags = {};

// add global tags
globalTags.nodejs = process.version;
globalTags.version = ConfigHelper.getVersion();


// initialize sentry instance
if (ConfigHelper.getSentryDSN()) {
    Sentry.init({dsn: ConfigHelper.getSentryDSN()});
}


/**
 * LogHelper
 *
 * @module helpers/log
 * @class LogHelper
 */
class LogHelper {
    constructor(module, options) {
        this.module = module;
        this.options = options || {};
    }


    _log(s) {
        const t = {};
        let i;

        s = _.extend({}, {
            id: 0,
            error: null,
            time: null,
            level: 'log',
            module: this.module || null,
            param_message: null,
            report: false,
            request: null,
            user: null,
            extra: {},
            options: {},
            callback: null
        }, s);
        s.options = s.options || {};

        // add Time
        s.time = new Date().toGMTString();

        // add custom Tags
        _.extend(s.extra, globalTags);

        // add request
        if (s.options && s.options.request && s.options.request instanceof http.IncomingMessage) {
            s.request = s.options.request;
        }

        // add user
        if (s.options && s.options.user) {
            s.user = s.options.user;
        }

        // add path infos
        if (s.options && s.options.request) {
            s.pathname = s.options.request._parsedUrl.pathname;
        }


        // analyse arguments
        if (!s.error && (!s.args || s.args.length === 0)) {
            return null;
        }
        for (i in s.args) {
            if (Object.prototype.hasOwnProperty.call(s.args, i)) {
                t.argument = s.args[i];
                i = parseInt(i, 10);

                if (i === 0 && _.isString(t.argument)) {
                    s.error = t.argument;
                    t.isString = 1;
                    t.variables = [t.argument];
                }
                else if (i === 0) {
                    s.error = t.argument;
                }
                else if (t.argument instanceof http.IncomingMessage) {
                    s.options.request = t.argument;
                }
                else if (parseInt(i, 10) === s.args.length - 1 && _.isObject(t.argument)) {
                    _.extend(s.extra, t.argument);
                    if (t.isString) {
                        t.variables.push(t.argument);
                    }
                }
                else if (t.isString) {
                    t.variables.push(t.argument);
                }
            }
        }


        // generate id
        s.id = uuid().substr(0, 32).toUpperCase();

        // replace variables
        if (t.isString) {
            s.param_message = s.error;
            s.error = util.format.apply(null, t.variables);
        }

        // sentry
        if (s.report && !ConfigHelper.isDev() && ConfigHelper.getSentryDSN()) {
            Sentry.configureScope(scope => {
                scope.setExtra('machine', os.hostname() + ':' + ConfigHelper.getPort());
                scope.setTag('module', s.module);
                scope.addTag('id', s.id);
                scope.addTag('level', s.level);
                scope.setUser(s.user);

                Sentry[s.level === 'error' ? 'captureException' : 'captureMessage'](s.error);
                scope.clear();
            });
        }

        // json log
        if(
            process.mainModule && process.mainModule.filename &&
            (
                process.mainModule.filename.substr(-13) === '/bin/database' ||
                process.mainModule.filename.substr(-11) === '/bin/plugin' ||
                process.mainModule.filename.substr(-9) === '/bin/user'
            )
        ) {
            const map = {fatal: 'error', error: 'error', warning: 'warn', info: 'info', debug: 'log'};

            if(s.module !== 'Database') {
                console[map[s.level]](s.error); // eslint-disable-line no-console
            }
        }else {
            logger[s.level === 'warning' ? 'warn' : s.level](_.extend({}, s.extra, {
                id: s.id,
                module: s.module,
                username: s.user,
                machine: os.hostname() + ':' + ConfigHelper.getPort(),
                pathname: s.pathname,
                req: s.request
            }), s.error);
        }

        // Exception
        if (ConfigHelper.isDev() && ['fatal', 'error'].indexOf(s.level) >= 0 && s.error instanceof Error) {
            throw s.error;
        }

        return s;
    }


    fatal() {
        let myLog = this._log({
            args: arguments,
            level: 'fatal',
            report: true
        });

        return myLog;
    }

    error() {
        return this._log({
            args: arguments,
            level: 'error',
            report: true
        });
    }

    warn() {
        return this._log({
            args: arguments,
            level: 'warning',
            report: true
        });
    }

    info() {
        return this._log({
            args: arguments,
            level: 'info',
            report: false
        });
    }

    debug() {
        return this._log({
            args: arguments,
            level: 'debug',
            report: false
        });
    }

    log() {
        return this._log({
            args: arguments,
            level: 'debug',
            report: false
        });
    }

    context(method, cb) {
        let returned,
            error;

        try {
            returned = method();
        }
        catch (err) {
            error = this._log({
                error: err,
                level: 'error',
                report: true
            });
        }

        if (_.isFunction(cb)) {
            cb(error || null, returned);
        }

        return returned;
    }

    wrap(method, cb) {
        const l = this;
        return function () {
            return l.context(method, cb);
        };
    }
}

// process exit log
if (!ConfigHelper.isDev()) {
    process.on('uncaughtException', function (err) {
        const log = new LogHelper('LogHelper');

        log.fatal({
            error: err,
            level: 'error',
            module: 'root',
            report: true
        });
    });
}

module.exports = LogHelper;
