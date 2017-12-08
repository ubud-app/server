'use strict';

const configs = [];

/**
 * PluginTools
 *
 * @class PluginTools
 */
class PluginTools {
    static getConfig() {
        return configs;
    }
}

PluginTools.Config = class {
    constructor(options) {
        if(!options.id) {
            throw new Error('id is required!');
        }
        if(typeof options.id !== 'string') {
            throw new Error('id has to be a string');
        }

        this.values = {
            id: options.id
        };

        configs.push(this);
    }
    toJSON() {
        return this.values;
    }
};

PluginTools.Account = class {

};

PluginTools.Transaction = class {

};

PluginTools.Memo = class {

};

PluginTools.Split = class {

};

PluginTools.Unit = class {

};

PluginTools.Link = class {

};

PluginTools.Goal = class {

};

PluginTools.ConfigurationError = class {

};

PluginTools.ConfigurationErrors = class {

};

module.exports = PluginTools;