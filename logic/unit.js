'use strict';

const BaseLogic = require('./_');

class UnitLogic extends BaseLogic {
    static getModelName() {
        return 'unit';
    }

    static getPluralModelName() {
        return 'units';
    }

    static disableSequelizeSocketHooks() {
        return true;
    }
}

module.exports = UnitLogic;