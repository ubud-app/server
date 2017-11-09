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
    }
}

module.exports = ErrorResponseHelper;