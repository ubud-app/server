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

        /* eslint-disable security/detect-non-literal-regexp */
        return new RegExp(regex, '');
        /* eslint-enable security/detect-non-literal-regexp */
    }

    static serveCreate(options) {
        const l = this;
        if (!l.create) {
            throw new ErrorResponse(501, 'Not implemented yet!');
        }

        return l.create(options.body, options)
            .then(({model, secrets}) => {
                return l.format(model, secrets || {}, options);
            })
            .catch(function (err) {
                throw err;
            });
    }

    static serveGet(options) {
        const l = this;
        if (!l.get) {
            throw new ErrorResponse(501, 'Not implemented yet!');
        }

        return l.get(options.id, options)
            .then(function (model) {
                if (!model) {
                    throw new ErrorResponse(404, 'Not Found');
                }
                return l.format(model, {}, options);
            })
            .catch(function (err) {
                throw err;
            });
    }

    static serveList(options) {
        const l = this;
        if (!l.list) {
            throw new ErrorResponse(501, 'Not implemented yet!');
        }

        return l.list(options.params, options)
            .then(function (models) {
                return Promise.all(models.map(model => l.format(model, {}, options)));
            })
            .catch(function (err) {
                throw err;
            });
    }

    static serveUpdate(options) {
        const l = this;

        return new Promise(function (cb) {
            if (!l.update || !l.get) {
                throw new ErrorResponse(501, 'Not implemented yet!');
            }
            if (!options.id) {
                throw new ErrorResponse(400, 'You need an ID to make an update!');
            }

            cb();
        })
            .then(function () {
                return l.get(options.id, options);
            })
            .then(function (model) {
                if (!model) {
                    throw new ErrorResponse(404, 'Not Found');
                }

                return l.update(model, options.body, options);
            })
            .then(({model, secrets}) => {
                return l.format(model, secrets || {}, options);
            })
            .catch(function (err) {
                throw err;
            });
    }

    static serveDelete(options) {
        const l = this;

        if (!options.id) {
            throw new ErrorResponse(400, 'You need an ID to make an update!');
        }
        if (!l.delete) {
            throw new ErrorResponse(501, 'Not implemented yet!');
        }

        return l.get(options.id, options)
            .then(function (model) {
                if (!model) {
                    throw new ErrorResponse(404, 'Not Found');
                }
                return model;
            })
            .then(model => {
                l.delete(model, options);
            })
            .catch(e => {
                throw e;
            });
    }
}


module.exports = BaseLogic;