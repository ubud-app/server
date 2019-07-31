'use strict';

const ErrorResponse = require('./errorResponse');
const LogHelper = require('./log');
const log = new LogHelper('SocketRequestHandler');


/**
 * SocketRequestHandlerHelper
 *
 * @module helpers/socketRequestHandler
 * @class SocketRequestHandlerHelper
 */
class SocketRequestHandler {
    /**
     * @param {Object} options
     * @param {Logic} [options.Logic]
     * @param {String} [options.route]
     * @param {SocketSession} [options.session]
     * @param {Object|Array} [options.data]
     * @param {Function} [options.cb]
     */
    constructor(options) {
        this.Logic = options.Logic;
        this.route = options.route;
        this.session = options.session;
        this.data = options.data;
        this.cb = options.cb;
    }

    /**
     * Handle the request.
     * Requires all options in constructor to be set.
     *
     * @returns {SocketRequestHandler}
     */
    run() {
        const cb = this.cb;

        try {
            this.checkSession()
                .then(session => this.runLogic(session))
                .then(response => this.success(response), error => this.error(error))
                .catch(function (err) {
                    log.error(err);

                    try {
                        cb({
                            error: 500,
                            message: 'Unknown internal error (1)',
                            attributes: {}
                        });
                    }
                    catch (sendErr) {
                        log.debug(sendErr);
                    }
                });
        }
        catch (err) {
            log.error(err);

            try {
                cb({
                    error: 500,
                    message: 'Unknown internal error (2)',
                    attributes: {}
                });
            }
            catch (sendErr) {
                log.debug(sendErr);
            }
        }

        return this;
    }

    /**
     * Checks the Session
     * @returns {Promise}
     */
    checkSession() {
        const Logic = this.Logic;
        const route = this.route;
        const data = this.data;
        const session = this.session;

        if (!session.isAuthenticated() && Logic.getModelName() === 'session' && route === 'create') {
            return Promise.resolve({
                name: data.email,
                pass: data.password
            });
        }

        if (!session.isAuthenticated()) {
            return Promise.reject(new ErrorResponse(
                401,
                'You are not  authenticated. Use the `auth` event to login or create a new session…'
            ));
        }

        return Promise.resolve(session.getSessionModel());
    }

    /**
     * Runs the logic (Logic.get etc.) for
     * the given request
     *
     * @param {Model} session
     * @returns {Promise}
     */
    runLogic(session) {
        const Logic = this.Logic;
        const method = 'serve' + this.route.substr(0, 1).toUpperCase() + this.route.substr(1);

        const params = {};
        (this.data.id || '').split('/').forEach(part => {
            const p = part.split(':', 2);
            params[p[0]] = p[1] !== undefined ? p[1] : true;
        });

        const options = {
            id: this.data.id || null,
            body: this.data || {},
            session: session,
            params,
            setSession: session => {
                this.session.setSessionModel(session);
            }
        };

        return Logic[method](options).catch(e => {
            throw e;
        });
    }

    /**
     * Yeah! We need a success response…
     * @param {Object|Array} result
     */
    success(result) {
        this.cb(result || {});
    }

    /**
     * Oups. We need a error response…
     * @param {Error} err
     */
    error(err) {
        const cb = this.cb;

        if (err instanceof Error && !(err instanceof ErrorResponse)) {
            err = new ErrorResponse(500, err, {
                reference: log.error(err)
            });
        }
        if (err instanceof ErrorResponse) {
            cb(err.toJSON());
            return;
        }

        throw err;
    }
}


module.exports = SocketRequestHandler;