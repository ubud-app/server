'use strict';

const BaseLogic = require('./_');

class PluginConfigLogic extends BaseLogic {
    static getModelName() {
        return 'plugin-config';
    }

    static getPluralModelName() {
        return 'plugin-configs';
    }

    static disableSequelizeSocketHooks() {
        return true;
    }
}

module.exports = PluginConfigLogic;