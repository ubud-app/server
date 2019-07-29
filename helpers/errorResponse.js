'use strict';

class ErrorResponseHelper extends Error {
    /**
     * ErrorResponse
     *
     * @param {number} [status] HTTP Status Code
     * @param {string|Error} message
     * @param {object} [options]
     * @param {Object} [options.attributes] Example: {name: 'Too long!'}
     * @param {string} [options.reference}
     * @param {Object} [options.extra] Example: {termsUrl: 'https://…'}
     */
    constructor(status, message, options) {
        if (!message) {
            message = status;
            status = 500;
        }

        super(message);
        this.name = 'ErrorResponse';
        this.status = status;
        this.options = options || {};
        this.options.attributes = options && options.attributes ? options.attributes : {};
        this.options.extra = options && options.extra ? options.extra : {};
    }

    toJSON () {
        return Object.assign({
            error: this.status,
            message: this.message
        }, this.options);
    }
}

module.exports = ErrorResponseHelper;