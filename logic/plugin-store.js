'use strict';

const BaseLogic = require('./_');

class PluginConfigLogic extends BaseLogic {
    static getModelName() {
        return 'plugin-store';
    }

    static getPluralModelName() {
        return 'plugin-stores';
    }

    static disableSequelizeSocketHooks() {
        return true;
    }
}

module.exports = PluginConfigLogic;