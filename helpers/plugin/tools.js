'use strict';

const config = [];

/**
 * PluginTools
 *
 * @class PluginTools
 */
class PluginTools {
    static _getConfig() {
        return config;
    }
    static _hasConfig(key) {
        const conf = config.find(c => c.id() === key);
        return !!conf;
    }
    static config(key) {
        if(PluginTools._config && PluginTools._config[key]) {
            return PluginTools._config[key];
        }

        const conf = config.find(c => c.id() === key);
        if(!conf) {
            return null;
        }

        return conf.value();
    }
}

PluginTools.Config = class {

    /**
     * Use this Constructor to add a configuration this plugin
     * requires to do it's work…
     *
     * @param {Object} options
     * @param {String} options.id ID
     * @param {Object} [options.value] Value
     * @param {Object} [options.defaultValue] Default Value
     * @param {String} options.type One of text, email, number, password or tel
     * @param {String} options.label Label key
     * @param {String} [options.placeholder] Placeholder
     */
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
        if(options.type && ['text', 'email', 'number', 'password', 'tel'].indexOf(options.type) === -1) {
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

        config.push(this);
    }

    /**
     * Returns the id of this configuration
     * @returns {String}
     */
    id() {
        return this._values.id;
    }

    /**
     * Returns the value of this configuration
     * @returns {Object}
     */
    value() {
        return this._values.value;
    }

    /**
     * Returns a JSON representation of the
     * configuration data
     *
     * @returns {{id: String, value: Object, defaultValue: Object|null, type: String, label: String, placeholder: String|null}}
     */
    toJSON() {
        return this._values;
    }
};

PluginTools.Account = class {
    constructor (options) {
        const AccountLogic = require('../../logic/account');

        // id
        if(!options.id) {
            throw new Error('`id` is required!');
        }
        if(typeof options.id !== 'string') {
            throw new Error('`id` has to be a string');
        }
        if(options.id.length > 255) {
            throw new Error('`id` has a max length of 255');
        }

        // type
        if(!options.type) {
            options.type = 'checking';
        }
        if(typeof options.type !== 'string') {
            throw new Error('`type` has to be a string');
        }
        if(AccountLogic.getValidTypeValues().indexOf(options.type) === -1) {
            throw new Error('`type` need to be one of: ' + AccountLogic.getValidTypeValues().join(', '));
        }

        // name
        if(!options.name) {
            throw new Error('`name` is required!');
        }
        if(typeof options.name !== 'string') {
            throw new Error('`name` has to be a string');
        }
        if(options.name.length > 255) {
            throw new Error('`name` has a max length of 255');
        }

        // balance
        if(!options.balance && options.balance !== 0) {
            throw new Error('`balance` is required!');
        }
        if(!Number.isInteger(options.balance)) {
            throw new Error('`balance` has to be an integer');
        }

        this._values = {
            id: options.id,
            type: options.type,
            name: options.name,
            balance: options.balance
        };
    }

    toJSON() {
        return this._values;
    }
};

PluginTools.Transaction = class {
    constructor (options) {
        const TransactionLogic = require('../../logic/transaction');
        const moment = require('moment');

        // id
        if(!options.id) {
            throw new Error('`id` is required!');
        }
        if(typeof options.id !== 'string') {
            throw new Error('`id` has to be a string');
        }
        if(options.id.length > 255) {
            throw new Error('`id` has a max length of 255');
        }

        // time
        if(!moment.isMoment(options.time) && !(options.time instanceof Date)) {
            throw new Error('`time` has to be either a moment- or a Date object');
        }
        if(!moment(options.time).isValid()) {
            throw new Error('`time` is not valid');
        }

        // payeeId
        if(!options.payeeId) {
            throw new Error('`payeeId` is required!');
        }
        if(typeof options.payeeId !== 'string') {
            throw new Error('`payeeId` has to be a string');
        }
        if(options.payeeId.length > 255) {
            throw new Error('`payeeId` has a max length of 255');
        }

        // memo
        if(options.memo && typeof options.memo !== 'string') {
            throw new Error('`memo` has to be a string');
        }

        // amount
        if(!options.amount && options.amount !== 0) {
            throw new Error('`amount` is required!');
        }
        if(!Number.isInteger(options.amount)) {
            throw new Error('`amount` has to be an integer, `' + options.amount + '` given');
        }

        // status
        if(!options.status) {
            options.status = 'cleared';
        }
        if(typeof options.status !== 'string') {
            throw new Error('`status` has to be a string');
        }
        if(TransactionLogic.getValidStatusValues().indexOf(options.status) === -1) {
            throw new Error('`status` need to be one of: ' + TransactionLogic.getValidStatusValues().join(', '));
        }

        this._values = {
            id: options.id,
            time: moment(options.time).toJSON(),
            payeeId: options.payeeId,
            memo: options.memo ? options.memo.substr(0, 512) : null,
            amount: options.amount,
            status: options.status
        };
    }

    toJSON() {
        return this._values;
    }
};

PluginTools.Memo = class {
    constructor (memo) {
        this._memo = memo;
    }

    toJSON() {
        return {
            type: 'memo',
            memo: this._memo
        };
    }
};

PluginTools.Split = class {
    constructor (units) {
        this._units = units.map(unit => {
            if(!(unit instanceof PluginTools.Unit)) {
                throw new Error('All units are required to be instance of PluginTools.Unit');
            }

            return unit.toJSON();
        });
    }

    toJSON() {
        return {
            type: 'split',
            units: this._units
        };
    }
};

PluginTools.Unit = class {
    constructor (options) {
        // amount
        if(!options.amount && options.amount !== 0) {
            throw new Error('`amount` is required!');
        }
        if(!Number.isInteger(options.amount)) {
            throw new Error('`amount` has to be an integer');
        }

        // memo
        if(!options.memo) {
            throw new Error('`memo` is required!');
        }
        if(typeof options.memo !== 'string') {
            throw new Error('`memo` has to be a string');
        }
        if(options.memo.length > 255) {
            throw new Error('`memo` has a max length of 255');
        }

        this._values = {
            amount: options.amount,
            memo: options.memo
        };
    }

    toJSON() {
        return this._values;
    }
};

PluginTools.Goal = class {
    constructor (options) {
        // id
        if(!options.id) {
            throw new Error('`id` is required!');
        }
        if(typeof options.id !== 'string') {
            throw new Error('`id` has to be a string');
        }
        if(options.id.length > 255) {
            throw new Error('`id` has a max length of 255');
        }

        // title
        if(!options.title) {
            throw new Error('`title` is required!');
        }
        if(typeof options.title !== 'string') {
            throw new Error('`title` has to be a string');
        }
        if(options.title.length > 255) {
            throw new Error('`title` has a max length of 255');
        }

        // price
        if(!options.price && options.price !== 0) {
            throw new Error('`price` is required!');
        }
        if(!Number.isInteger(options.price)) {
            throw new Error('`price` has to be an integer');
        }

        this._values = {
            id: options.id,
            title: options.title,
            price: options.price
        };
    }

    toJSON() {
        return this._values;
    }
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
        if(['empty', 'invalid'].indexOf(options.code) === -1) {
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