'use strict';

const BaseLogic = require('./_');
const ErrorResponse = require('../helpers/errorResponse');
const PluginHelper = require('../helpers/plugin');
const DatabaseHelper = require('../helpers/database');

class PluginInstanceLogic extends BaseLogic {
    static getModelName () {
        return 'plugin-instance';
    }

    static getPluralModelName () {
        return 'plugin-instances';
    }

    static async format (plugin) {
        return plugin.toJSON(true);
    }

    static disableSequelizeSocketHooks () {
        return true;
    }

    static async create (attributes, options) {
        if (!attributes.type) {
            throw new ErrorResponse(400, 'PluginInstance requires attribute `type`…', {
                attributes: {
                    type: 'Is required!'
                }
            });
        }

        const PluginRepository = require('../helpers/repository');
        if (!await PluginRepository.getPluginById(attributes.type)) {
            throw new ErrorResponse(400, 'You can only install plugins which are listed in the plugin repository!', {
                attributes: {
                    type: 'Is not listed in plugin repository!'
                }
            });
        }

        if (!attributes.documentId) {
            throw new ErrorResponse(400, 'PluginInstance requires attribute `documentId`…', {
                attributes: {
                    documentId: 'Is required!'
                }
            });
        }

        const DatabaseHelper = require('../helpers/database');
        const sql = {attributes: ['id']};
        if (!options.session.user.isAdmin) {
            sql.include = [{
                model: DatabaseHelper.get('user'),
                attributes: [],
                where: {
                    id: options.session.userId
                }
            }];
        }

        const document = await DatabaseHelper.get('document').findById(attributes.documentId, sql);
        if (!document) {
            throw new ErrorResponse(404, 'Could not create PluginInstance: document not found…', {
                attributes: {
                    documentId: 'Is not valid!'
                }
            });
        }

        const PluginHelper = require('../helpers/plugin');
        try {
            const plugin = await PluginHelper.installPlugin(attributes.type, document);
            return {model: plugin};
        }
        catch (err) {
            throw new ErrorResponse(500, 'Unable to install plugin: ' + err);
        }
    }

    static async get (id, options) {
        const plugins = await PluginHelper.listPlugins();
        const plugin = plugins.find(p => p.id() === id);
        if (!plugin) {
            return null;
        }

        if (!options.session.user.isAdmin) {
            const DatabaseHelper = require('../helpers/database');
            const document = await DatabaseHelper.get('document').findById(plugin.documentId(), {
                include: [{
                    model: DatabaseHelper.get('user'),
                    attributes: [],
                    where: {
                        id: options.session.userId
                    }
                }]
            });

            if (!document) {
                return null;
            }
        }

        return plugin;
    }

    static async list (params, options) {
        if (!options.session.user.isAdmin) {
            throw new ErrorResponse(403, 'Only admins are allowed to list all plugins…');
        }
        if (params.document) {
            const document = await DatabaseHelper.get('document').findById(params.document);

            if (!document) {
                return [];
            } else {
                const plugins = await PluginHelper.listPlugins();
                return plugins.filter(p => p.documentId() === document.id);
            }
        }

        return PluginHelper.listPlugins();
    }

    static async update (model, body) {
        if (body && body.config && body.config.length > 0) {
            const values = {};

            body.config.forEach(field => {
                values[field.id] = field.value;
            });

            const errors = await model.checkAndSaveConfig(values);
            if (errors.length > 0) {
                const attributes = {};
                errors.forEach(error => {
                    if (error.code === 'empty') {
                        attributes[error.field] = 'Field `' + error.field + '` is required, but empty.';
                    }
                    else if (error.code === 'wrong') {
                        attributes[error.field] = 'Field `' + error.field + '` is not valid.';
                    }
                    else {
                        attributes[error.field] = 'Field `' + error.field + '` validation failed without reason.';
                    }
                });

                throw new ErrorResponse(400, 'Plugin settings are not valid', {attributes});
            }
        }

        return model;
    }

    static async delete (instance) {
        const PluginHelper = require('../helpers/plugin');
        try {
            await PluginHelper.removePlugin(instance);
        }
        catch (err) {
            throw new ErrorResponse(500, 'Unable to remove plugin: ' + err);
        }
    }
}

module.exports = PluginInstanceLogic;