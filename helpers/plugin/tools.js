'use strict';

const configs = [];

/**
 * PluginTools
 *
 * @class PluginTools
 */
class PluginTools {
    static _getConfig() {
        return configs;
    }
    static _hasConfig(key) {
        const conf = configs.find(c => c.id() === key);
        return !!conf;
    }
    static config(key) {
        const conf = configs.find(c => c.id() === key);
        if(!conf) {
            return null;
        }

        return conf.value();
    }
}

PluginTools.Config = class {
    constructor(options) {

        // id
        if(!options.id) {
            throw new Error('`id` is required!');
        }
        if(typeof options.id !== 'string') {
            throw new Error('`id` has to be a string');
        }
        if(options.id.length > 40) {
            throw new Error('`id` has a max length of 40');
        }

        // value
        if(!options.value) {
            options.value = PluginTools.config(options.id);
        }
        if(JSON.stringify(options.value).length > 255) {
            throw new Error('`value` is too long!');
        }

        // default value
        if(options.defaultValue && JSON.stringify(options.defaultValue).length > 255) {
            throw new Error('`defaultValue` is too long!');
        }

        // type
        if(options.type && ['text', 'checkbox', 'email', 'number', 'password', 'tel'].indexOf(options.type) === -1) {
            throw new Error('`type` is invalid!');
        }

        // label
        if(!options.label) {
            throw new Error('`label` is required!');
        }
        if(typeof options.label !== 'string') {
            throw new Error('`label` has to be a string');
        }
        if(options.label.length > 40) {
            throw new Error('`label` has a max length of 40');
        }

        // placeholder
        if(options.placeholder && typeof options.placeholder !== 'string') {
            throw new Error('`placeholder` has to be a string');
        }
        if(options.placeholder && options.placeholder.length > 60) {
            throw new Error('`placeholder` has a max length of 60');
        }

        this._values = {
            id: options.id,
            value: options.value || null,
            defaultValue: options.defaultValue || null,
            type: options.type || 'text',
            label: options.label,
            placeholder: options.placeholder || null
        };

        configs.push(this);
    }

    id() {
        return this._values.id;
    }

    value() {
        return this._values.value;
    }

    toJSON() {
        return this._values;
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
    constructor(options) {

        // field
        if(!options.field) {
            throw new Error('Unable to build ConfigurationError: `field` is required!');
        }
        if(typeof options.field !== 'string') {
            throw new Error('Unable to build ConfigurationError: `field` is not a string!');
        }
        if(!PluginTools._hasConfig(options.field)) {
            throw new Error('Unable to build ConfigurationError: field `' + options.field + '` is not defined via new PluginTools.Config() before!');
        }

        // code
        if(!options.code) {
            throw new Error('Unable to build ConfigurationError: `code` is required!');
        }
        if(['empty', 'wrong'].indexOf(options.code) === -1) {
            throw new Error('Unable to build ConfigurationError: `code` is required!');
        }

        this._json = {
            field: options.field,
            code: options.code
        };
    }

    toJSON() {
        return this._json;
    }
};

PluginTools.ConfigurationErrors = class {
    constructor(options) {
        if(!Array.isArray(options)) {
            throw new Error('Unable to build ConfigurationErrors: parameter needs to be an array!');
        }
        if(!options.length) {
            throw new Error('Unable to build ConfigurationErrors: there\'s no error defined!');
        }

        this._errors = options.map(e => new PluginTools.ConfigurationError(e));
    }

    toJSON() {
        return this._errors.map(e => e.toJSON());
    }
};

module.exports = PluginTools;