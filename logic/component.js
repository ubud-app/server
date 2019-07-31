'use strict';

const BaseLogic = require('./_');
const RepositoryHelper = require('../helpers/repository');

class ComponentLogic extends BaseLogic {
    static getModelName() {
        return 'component';
    }

    static getPluralModelName() {
        return 'components';
    }

    static format(component) {
        return component;
    }

    static async get(id) {
        return RepositoryHelper.getComponent(id);
    }

    static async list() {
        return RepositoryHelper.getComponents();
    }
}

module.exports = ComponentLogic;
