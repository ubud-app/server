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

    static get(id) {
        return RepositoryHelper.getPluginById(id);
    }

    static async list(params) {
        let plugins = await RepositoryHelper.getPlugins();

        /**
         * - name
         * - bic
         * - iban
         * - account
         * - metadata
         * - goal
         */
        const q = params.q ? params.q.toString().toLowerCase() : null;
        plugins = plugins.filter(plugin => {
            if(!q) {
                return true;
            }

            return !!plugin.responsibilities.find(r => {
                // account
                if(params.account && !r.account) {
                    return false;
                }

                // metadata
                if(params.metadata && !r.metadata) {
                    return false;
                }

                // goal
                if(params.goal && !r.goal) {
                    return false;
                }

                // account
                if(params.account && !r.account) {
                    return false;
                }

                // name
                if(q && r.name.toLowerCase().includes(q)) {
                    return true;
                }

                // bic
                if(q && r.bic && r.bic.find(bic => bic.toLowerCase().startsWith(q))) {
                    return true;
                }

                // iban
                if(q && r.iban && r.iban.find(iban => iban.toLowerCase().startsWith(q))) {
                    return true;
                }
            });
        });

        return plugins;
    }
}

module.exports = PluginLogic;