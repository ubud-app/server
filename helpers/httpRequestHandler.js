'use strict';

const ErrorResponse = require('./errorResponse');
const DatabaseHelper = require('./database');
const LogHelper = require('./log');
const log = new LogHelper('HTTPRequestHandler');


/**
 * HTTPRequestHandlerHelper
 *
 * @module helpers/httpRequestHandler
 * @class HTTPRequestHandlerHelper
 */
class HTTPRequestHandler {
    /**
     * @param {Object} options
     * @param {Logic} [options.Logic]
     * @param {String} [options.route]
     * @param {Object} [options.req]
     * @param {Object} [options.res]
     */
    constructor(options) {
        this.Logic = options.Logic;
        this.route = options.route;
        this.req = options.req;
        this.res = options.res;
    }

    /**
     * Handle the request.
     * Requires all options in constructor to be set.
     *
     * @returns {HTTPRequestHandler}
     */
    run() {
        const res = this.res;

        this.checkSession()
            .then(session => this.runLogic(session))
            .then(response => this.success(response), error => this.error(error))
            .catch(function (err) {
                log.error(err);

                try {
                    res.sendStatus(500);
                }
                catch (sendErr) {
                    log.debug(sendErr);
                }
            });

        return this;
    }

    /**
     * Checks the Session
     * @returns {Promise}
     */
    async checkSession() {
        const auth = require('basic-auth');
        const bcrypt = require('bcrypt');

        const Logic = this.Logic;
        const route = this.route;

        const req = this.req;
        let credentials;
        try {
            credentials = auth(req);
        }
        catch (err) {
            throw new ErrorResponse(401, 'Not able to parse your `Authorization` header…');
        }

        if (!credentials) {
            throw new ErrorResponse(401, '`Authorization` header missing…');
        }
        if (!credentials.name) {
            throw new ErrorResponse(401, 'Error in `Authorization` header: username / session id empty…');
        }
        if (!credentials.pass) {
            throw new ErrorResponse(401, 'Error in `Authorization` header: password / session secret empty…');
        }

        if (Logic.getModelName() === 'session' && route === 'create' && credentials.name.length !== 36) {
            return new Promise(function (cb) {
                cb(credentials);
            });
        }

        const session = await DatabaseHelper.get('session').findOne({
            where: {
                id: credentials.name
            },
            include: [{
                model: DatabaseHelper.get('user')
            }]
        });
        if (!session) {
            throw new ErrorResponse(401, 'Not able to authorize: Is session id and secret correct?');
        }

        const isSessionCorrect = await bcrypt.compare(credentials.pass, session.secret);
        if (!isSessionCorrect) {
            throw new ErrorResponse(401, 'Not able to authorize: Is session id and secret correct?');
        }

        if (session.mobilePairing && (Logic.getModelName() !== 'session' || req.params[0] !== session.id)) {
            throw new ErrorResponse(401, 'Not able to authorize: This is a session for the mobile auth flow only.');
        }

        return session;
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
        const options = {
            id: this.req.params[0] || null,
            body: this.req.body || {},
            params: this.req.query,
            session: session,
            httpRequest: this.req
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
        const res = this.res;

        if (!result) {
            res.sendStatus(204);
        } else {
            res.send(result);
        }
    }

    /**
     * Oups. We need a error response…
     * @param {Error} err
     */
    error(err) {
        const res = this.res;

        if (err instanceof Error && !(err instanceof ErrorResponse)) {
            err = new ErrorResponse(500, err, {
                reference: log.error(err).id
            });
        }
        if (err instanceof ErrorResponse) {
            res.status(err.status).send({
                message: err.message,
                attributes: err.options.attributes || {}
            });
            return;
        }

        throw err;
    }
}


module.exports = HTTPRequestHandler;