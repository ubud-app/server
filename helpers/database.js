'use strict';

const EventEmitter = require('events');
const Sequelize = require('sequelize');
const fs = require('fs');
const LogHelper = require('./log.js');
const ConfigHelper = require('./config.js');

const log = new LogHelper('Database');
const modelEvents = new EventEmitter();
const models = {};


// initialize sequalize.js
let sequelize;
try {
    sequelize = new Sequelize(ConfigHelper.getDatabaseURI(), {
        logging: function (text) {
            log.log(text);
        },
        define: {
            timestamps: true,
            charset: 'utf8',
            collate: 'utf8_general_ci'
        },
        pool: {
            maxConnections: 5,
            maxIdleTime: 30
        },
        operatorsAliases: false
    });
}
catch (err) {
    log.fatal('Unable to connect to database `%s`: Is the database URI correct?', ConfigHelper.getDatabaseURI());
    process.exit(1);
}


// load models (sync)
/* eslint-disable security/detect-non-literal-fs-filename */
fs.readdirSync(__dirname + '/../models').forEach(function (modelFile) {
    /* eslint-enable security/detect-non-literal-fs-filename */
    const name = modelFile.split('.')[0];

    if (name) {
        /* eslint-disable security/detect-non-literal-require */
        const def = require(__dirname + '/../models/' + modelFile);
        /* eslint-enable security/detect-non-literal-require */

        models[name] = sequelize.define(
            name,
            def.getDefinition(Sequelize),
            {
                hooks: {
                    afterCreate (model) {
                        if (def.disableSequelizeSocketHooks && def.disableSequelizeSocketHooks('create') === true) {
                            return;
                        }
                        setTimeout(function () {
                            modelEvents.emit('update', {
                                action: 'created',
                                name: name,
                                model: model
                            });
                        }, 10);
                    },
                    afterDestroy (model) {
                        if (def.disableSequelizeSocketHooks && def.disableSequelizeSocketHooks('destroy') === true) {
                            return;
                        }
                        setTimeout(function () {
                            modelEvents.emit('update', {
                                action: 'deleted',
                                name: name,
                                model: model
                            });
                        }, 10);
                    },
                    afterUpdate (model) {
                        if (def.disableSequelizeSocketHooks && def.disableSequelizeSocketHooks('update') === true) {
                            return;
                        }
                        setTimeout(function () {
                            modelEvents.emit('update', {
                                action: 'updated',
                                name: name,
                                model: model
                            });
                        }, 10);
                    },
                    afterSave (model) {
                        if (def.disableSequelizeSocketHooks && def.disableSequelizeSocketHooks('save') === true) {
                            return;
                        }
                        setTimeout(function () {
                            modelEvents.emit('update', {
                                action: 'updated',
                                name: name,
                                model: model
                            });
                        }, 10);
                    }
                },
                indexes: def.getIndexes ? def.getIndexes() : [],
                paranoid: def.isParanoid ? !!def.isParanoid() : false
            }
        );
    }
});


// setup associations
models.document.hasMany(models.account, {foreignKey: {allowNull: false}, onDelete: 'CASCADE'});
models.account.belongsTo(models.document, {foreignKey: {allowNull: false}, onDelete: 'CASCADE'});

models['plugin-instance'].hasOne(models.account, {onDelete: 'SET NULL'});
models.account.belongsTo(models['plugin-instance'], {onDelete: 'SET NULL'});

models.account.hasMany(models.transaction, {foreignKey: {allowNull: false}, onDelete: 'CASCADE'});
models.transaction.belongsTo(models.account, {foreignKey: {allowNull: false}, onDelete: 'CASCADE'});

models.payee.hasMany(models.transaction, {onDelete: 'CASCADE'});
models.transaction.belongsTo(models.payee, {onDelete: 'CASCADE'});

models.document.hasMany(models.payee, {onDelete: 'CASCADE'});
models.payee.belongsTo(models.document, {onDelete: 'CASCADE'});

models.transaction.hasMany(models.unit, {foreignKey: {allowNull: false}, onDelete: 'CASCADE'});
models.unit.belongsTo(models.transaction, {foreignKey: {allowNull: false}, onDelete: 'CASCADE'});

models.budget.hasOne(models.unit, {onDelete: 'CASCADE'});
models.unit.belongsTo(models.budget, {onDelete: 'CASCADE'});

models.document.hasMany(models.category, {foreignKey: {allowNull: false}, onDelete: 'CASCADE'});
models.category.belongsTo(models.document, {foreignKey: {allowNull: false}, onDelete: 'CASCADE'});

models['plugin-instance'].hasOne(models.budget, {onDelete: 'CASCADE'});
models.budget.belongsTo(models['plugin-instance'], {onDelete: 'CASCADE'});

models.category.hasMany(models.budget, {foreignKey: {allowNull: false}, onDelete: 'CASCADE'});
models.budget.belongsTo(models.category, {foreignKey: {allowNull: false}, onDelete: 'CASCADE'});

models.budget.hasMany(models.portion, {foreignKey: {allowNull: false}, onDelete: 'CASCADE'});
models.portion.belongsTo(models.budget, {foreignKey: {allowNull: false}, onDelete: 'CASCADE'});

models.document.hasMany(models.setting, {foreignKey: {allowNull: true}, onDelete: 'CASCADE'});
models.setting.belongsTo(models.document, {foreignKey: {allowNull: true}, onDelete: 'CASCADE'});

models.user.hasMany(models.session, {foreignKey: {allowNull: false}, onDelete: 'CASCADE'});
models.session.belongsTo(models.user, {foreignKey: {allowNull: false}, onDelete: 'CASCADE'});

models.user.belongsToMany(models.document, {through: models.share});
models.document.belongsToMany(models.user, {through: models.share});

models.document.hasMany(models['plugin-instance'], {foreignKey: {allowNull: false}, onDelete: 'CASCADE'});
models['plugin-instance'].belongsTo(models.document, {foreignKey: {allowNull: false}, onDelete: 'CASCADE'});

models.document.hasMany(models.learning, {foreignKey: {allowNull: false}, onDelete: 'CASCADE'});
models.learning.belongsTo(models.document, {foreignKey: {allowNull: false}, onDelete: 'CASCADE'});

models.category.hasMany(models.learning, {foreignKey: {allowNull: false}, onDelete: 'CASCADE'});
models.learning.belongsTo(models.category, {foreignKey: {allowNull: false}, onDelete: 'CASCADE'});

models.document.hasMany(models.summary, {foreignKey: {allowNull: false}, onDelete: 'CASCADE'});
models.summary.belongsTo(models.document, {foreignKey: {allowNull: false}, onDelete: 'CASCADE'});

models['plugin-instance'].hasMany(models['plugin-config'], {foreignKey: {allowNull: false}, onDelete: 'CASCADE'});
models['plugin-config'].belongsTo(models['plugin-instance'], {foreignKey: {allowNull: false}, onDelete: 'CASCADE'});

models['plugin-instance'].hasMany(models['plugin-store'], {foreignKey: {allowNull: false}, onDelete: 'CASCADE'});
models['plugin-store'].belongsTo(models['plugin-instance'], {foreignKey: {allowNull: false}, onDelete: 'CASCADE'});


/**
 * DatabaseHelper
 *
 * @module helpers/database
 * @class DatabaseHelper
 */
class DatabaseHelper {
    /**
     * Returns the model specified by the model name
     *
     * @example DatabaseHelper.get('user') -> Sequelize Model
     * @param {String} name Name of model
     * @returns {Model}
     */
    static get (name) {
        if (!models[name]) {
            throw new Error('Can\'t get model `' + name + '`: Model unknown.');
        }
        return models[name];
    }

    /**
     * Returns the database migrator required to do
     * database migrations. Used in bin/database to
     * run migrations.
     *
     * @returns {Umzug}
     */
    static getMigrator () {
        const Umzug = require('umzug');
        const path = require('path');
        const log = new LogHelper('DatabaseMigrator');

        return new Umzug({
            storage: 'sequelize',
            storageOptions: {
                sequelize: sequelize,
                modelName: '_migrations'
            },
            logging: function (text) {
                log.info(text);
            },
            migrations: {
                params: [sequelize.getQueryInterface(), models, sequelize, Sequelize],
                path: path.resolve(__dirname + '/../migrations')
            }
        });
    }

    /**
     * Returns the EventEmitter instance which reflects
     * all model events for this server instance.
     *
     * @returns {EventEmitter}
     * @instance
     */
    static events () {
        return modelEvents;
    }

    /**
     * Resets the database by dropping all tables in
     * the database. Used in bin/database.
     *
     * @returns {Promise}
     */
    static reset () {
        return sequelize.dropAllSchemas({force: true});
    }

    /**
     * Closes all database connections.
     * @returns {Promise}
     */
    static close () {
        return sequelize.close();
    }

    /**
     * Small helper for checking permissions via database.
     * Adds an include for the user if it's not an admin, which
     * can generally see everything…
     *
     * @param {Session} session
     * @param {Object} [options]
     * @param {Boolean} [options.through]
     * @returns {*}
     */
    static includeUserIfNotAdmin (session, options) {
        if (!session || !session.user) {
            throw new Error('includeUserIfNotAdmin: Session is not valid!');
        }
        if (session.user.isAdmin) {
            return [];
        }

        options = options || {};

        const result = [{
            model: this.get('user'),
            attributes: [],
            where: {
                id: session.userId
            }
        }];

        if (options.through) {
            result[0].through = {attributes: []};
        }

        return result;
    }


    /**
     * Returns the Sequelize Op Object…
     * @param {String} [operator]
     * @returns {Sequelize.Op}
     */
    static op (operator) {
        if (operator) {
            return Sequelize.Op[operator];
        }

        return Sequelize.Op;
    }

    /**
     * @param {String} literal
     */
    static literal (literal) {
        return sequelize.literal(literal);
    }

    static where (k, v) {
        return sequelize.where(k, v);
    }

    static query (query) {
        return sequelize.query(query, {type: sequelize.QueryTypes.SELECT});
    }

    /**
     * Helps to get a sum
     * @param {String} column
     */
    static sum (column) {
        return sequelize.fn('sum', sequelize.col(column));
    }

    /**
     * Helps to get count of elements
     * @param {String} column
     */
    static count (column) {
        return sequelize.fn('count', sequelize.col(column));
    }
}

module.exports = DatabaseHelper;