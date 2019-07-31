'use strict';

const BaseLogic = require('./_');
const RepositoryHelper = require('../helpers/repository');

class PluginLogic extends BaseLogic {
    static getModelName() {
        return 'plugin';
    }

    static getPluralModelName() {
        return 'plugins';
    }

    static format(plugin) {
        return plugin;
    }

    static async get(id) {
        return RepositoryHelper.getPluginById(id);
    }

    static async list(params) {
        return RepositoryHelper.searchAccountPlugin(params.q);
    }
}

module.exports = PluginLogic;