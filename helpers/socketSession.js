'use strict';

const bcrypt = require('bcrypt');
const ErrorResponse = require('./errorResponse');
const DatabaseHelper = require('./database');

/**
 * SocketSession
 *
 * @module helpers/socketSession
 * @class SocketSession
 */
class SocketSession {
    constructor() {
        this.session = null;
    }

    /**
     * Try to authenticate the session with the given data…
     *
     * @param {Object} data
     * @param {String} data.id Session identifier
     * @param {String} data.secret Session secret
     * @returns {Promise}
     */
    async authenticate(data) {
        if (!data.id) {
            return Promise.reject(new ErrorResponse(401, 'Error in `auth` data: attribute `id` missing…'));
        }
        if (!data.secret) {
            return Promise.reject(new ErrorResponse(401, 'Error in `auth` data: attribute `secret` missing…'));
        }

        const session = await DatabaseHelper.get('session').findOne({
            where: {
                id: data.id || data.name
            },
            include: [{
                model: DatabaseHelper.get('user')
            }]
        });
        if (!session) {
            throw new ErrorResponse(401, 'Not able to authorize: Is session id and secret correct?');
        }
        if (session.mobilePairing) {
            throw new ErrorResponse(401, 'Not able to authorize: mobile auth flow not yet implemented for sockets');
        }

        const isSessionCorrect = await bcrypt.compare(data.secret, session.secret);
        if (!isSessionCorrect) {
            throw new ErrorResponse(401, 'Not able to authorize: Is session id and secret correct?');
        }

        return session;
    }

    /**
     * Return true, if this session is a authenticated one…
     * @returns {boolean}
     */
    isAuthenticated() {
        return !!this.session;
    }

    /**
     * Returns the session model
     * @returns {null}
     */
    getSessionModel() {
        return this.session || null;
    }

    /**
     * Sets the session model
     * @returns {SocketSession}
     */
    setSessionModel(session) {
        this.session = session;
        return this;
    }
}


module.exports = SocketSession;