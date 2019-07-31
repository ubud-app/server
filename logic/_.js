'use strict';

const ErrorResponse = require('../helpers/errorResponse');

class BaseLogic {
    static getModelName() {
        throw new ErrorResponse(500, 'getModelName() is not overwritten!');
    }

    static getPluralModelName() {
        throw new ErrorResponse(500, 'getModelName() is not overwritten!');
    }

    static getModel() {
        const DatabaseHelper = require('../helpers/database');
        return DatabaseHelper.get(this.getModelName());
    }

    static getAvailableRoutes() {
        return ['create', 'get', 'list', 'update', 'delete'];
    }

    static getPathForRoute(route) {
        let regex = '/api/' + this.getPluralModelName();
        if (['get', 'update', 'delete'].indexOf(route) > -1) {
            regex += '/([a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12})$';
        }
        else if (route === 'list') {
            regex += '/?([a-zA-Z]*)$';
        }

        return new RegExp(regex, ''); // eslint-disable-line security/detect-non-literal-regexp
    }

    static async serveCreate(options) {
        if (!this.create) {
            throw new ErrorResponse(501, 'Not implemented yet!');
        }

        const {model, secrets} = await this.create(options.body, options);
        return this.format(model, secrets || {}, options);
    }

    static async serveGet(options) {
        if (!this.get) {
            throw new ErrorResponse(501, 'Not implemented yet!');
        }

        const model = await this.get(options.id, options);
        if (!model) {
            throw new ErrorResponse(404, 'Not Found');
        }

        return this.format(model, {}, options);
    }

    static async serveList(options) {
        if (!this.list) {
            throw new ErrorResponse(501, 'Not implemented yet!');
        }

        const models = await this.list(options.params, options);
        return Promise.all(models.map(model =>
            this.format(model, {}, options)
        ));
    }

    static async serveUpdate(options) {
        if (!this.update || !this.get) {
            throw new ErrorResponse(501, 'Not implemented yet!');
        }
        if (!options.id) {
            throw new ErrorResponse(400, 'You need an ID to make an update!');
        }

        const before = await this.get(options.id, options);
        if (!before) {
            throw new ErrorResponse(404, 'Not Found');
        }

        const {model, secrets} = await this.update(before, options.body, options);
        return this.format(model, secrets || {}, options);
    }

    static async serveDelete(options) {
        if (!options.id) {
            throw new ErrorResponse(400, 'You need an ID to make an update!');
        }
        if (!this.delete) {
            throw new ErrorResponse(501, 'Not implemented yet!');
        }

        const model = await this.get(options.id, options);
        if (!model) {
            throw new ErrorResponse(404, 'Not Found');
        }

        await this.delete(model, options);
    }
}


module.exports = BaseLogic;