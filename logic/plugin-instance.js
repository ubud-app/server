'use strict';

const BaseLogic = require('./_');
const ErrorResponse = require('../helpers/errorResponse');
const PluginHelper = require('../helpers/plugin');

class PluginInstanceLogic extends BaseLogic {
    static getModelName() {
        return 'plugin-instance';
    }

    static getPluralModelName() {
        return 'plugin-instances';
    }

    static format(plugin) {
        return plugin.toJSON();
    }

    static async create(attributes, options) {
        if(!attributes.type) {
            throw new ErrorResponse(400, 'PluginInstance requires attribute `type`…', {
                attributes: {
                    type: 'Is required!'
                }
            });
        }

        const PluginRepository = require('../helpers/repository');
        if(!await PluginRepository.getPluginById(attributes.type)) {
            throw new ErrorResponse(400, 'You can only install plugins which are listed in the plugin repository!', {
                attributes: {
                    type: 'Is not listed in plugin repository!'
                }
            });
        }

        if(!attributes.documentId) {
            throw new ErrorResponse(400, 'PluginInstance requires attribute `documentId`…', {
                attributes: {
                    documentId: 'Is required!'
                }
            });
        }

        const DatabaseHelper = require('../helpers/database');
        const document = await DatabaseHelper.get('document').findById(attributes.documentId, {
            attributes: ['id'],
            include: [{
                model: DatabaseHelper.get('user'),
                attributes: [],
                where: {
                    id: options.session.userId
                }
            }]
        });
        if(!document) {
            throw new ErrorResponse(404, 'Could not create PluginInstance: document not found…', {
                attributes: {
                    documentId: 'Is not valid!'
                }
            });
        }

        const PluginHelper = require('../helpers/plugin');
        try {
            const plugin = await PluginHelper.installPlugin(attributes.type, document.id);
            return await plugin.toJSON();
        }
        catch(err) {
            throw new ErrorResponse(500, 'Unable to install plugin: ' + err);
        }
    }

    static async get(id, options) {
        const plugins = await PluginHelper.listPlugins();
        const plugin = plugins.find(p => p.id() === id);
        if(!plugin) {
            return null;
        }

        if (!options.session.user.isAdmin) {
            const DatabaseHelper = require('../helpers/database');
            const document = await DatabaseHelper.get('document').findById(plugin.documentId, {
                include: [{
                    model: DatabaseHelper.get('user'),
                    attributes: [],
                    where: {
                        id: options.session.userId
                    }
                }]
            });

            if(!document) {
                return null;
            }
        }

        return plugin;
    }

    static async list(params, options) {
        if (!options.session.user.isAdmin) {
            throw new ErrorResponse(403, 'Only admins are allowed to list all plugins…');
        }

        return PluginHelper.listPlugins();
    }

    static async delete(instance) {
        const PluginHelper = require('../helpers/plugin');
        try {
            await PluginHelper.removePlugin(instance);
        }
        catch(err) {
            throw new ErrorResponse(500, 'Unable to remove plugin: ' + err);
        }
    }
}

module.exports = PluginInstanceLogic;