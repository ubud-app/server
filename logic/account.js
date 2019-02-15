'use strict';

const _ = require('underscore');
const BaseLogic = require('./_');
const ErrorResponse = require('../helpers/errorResponse');

class AccountLogic extends BaseLogic {
    static getModelName() {
        return 'account';
    }

    static getPluralModelName() {
        return 'accounts';
    }

    static async format(account) {
        const DatabaseHelper = require('../helpers/database');

        const [transactionCount, transactionsWithoutUnits, notTransfer, transferOn, transferOff] = await Promise.all([
            DatabaseHelper.get('transaction').findOne({
                attributes: [
                    [DatabaseHelper.count('id'), 'value']
                ],
                where: {
                    accountId: account.id
                }
            }),
            DatabaseHelper.query(
                'SELECT SUM(`amount`) AS `value` ' +
                'FROM `transactions` AS `transaction` ' +
                'WHERE ' +
                '  (SELECT COUNT(*) FROM `units` WHERE `units`.`transactionId` = `transaction`.`id`) = 0 AND ' +
                '  `accountId` = "' + account.id + '";'
            ),
            DatabaseHelper.get('unit').findOne({
                attributes: [
                    [DatabaseHelper.sum('unit.amount'), 'value']
                ],
                where: {
                    type: {
                        [DatabaseHelper.op('not')]: 'TRANSFER'
                    }
                },
                include: [{
                    model: DatabaseHelper.get('transaction'),
                    attributes: ['id'],
                    required: true,
                    where: {
                        accountId: account.id
                    }
                }]
            }),
            DatabaseHelper.get('unit').findOne({
                attributes: [
                    [DatabaseHelper.sum('unit.amount'), 'value']
                ],
                where: {
                    type: 'TRANSFER'
                },
                include: [{
                    model: DatabaseHelper.get('transaction'),
                    attributes: ['id'],
                    required: true,
                    where: {
                        accountId: account.id
                    }
                }]
            }),
            DatabaseHelper.get('unit').findOne({
                attributes: [
                    [DatabaseHelper.sum('amount'), 'value']
                ],
                where: {
                    type: 'TRANSFER',
                    transferAccountId: account.id
                }
            })
        ]);

        return {
            id: account.id,
            name: account.name,
            type: account.type,
            number: account.number,
            balance: (
                (parseInt(notTransfer.dataValues.value, 10) || 0) +
                (parseInt(transactionsWithoutUnits[0].value, 10) || 0) +
                (parseInt(transferOn.dataValues.value, 10) || 0) -
                (parseInt(transferOff.dataValues.value, 10) || 0)
            ),
            transactions: parseInt(transactionCount.dataValues.value, 10) || 0,
            documentId: account.documentId,
            pluginInstanceId: account.pluginInstanceId
        };
    }

    static getValidTypeValues() {
        return ['checking', 'savings', 'creditCard', 'cash', 'paypal', 'mortgage', 'asset', 'loan'];
    }

    static async create(body, options) {
        const DatabaseHelper = require('../helpers/database');
        const model = this.getModel().build();

        model.name = body.name;
        if (!model.name) {
            throw new ErrorResponse(400, 'Account requires attribute `name`…', {
                attributes: {
                    name: 'Is required!'
                }
            });
        }
        if (model.name.length > 255) {
            throw new ErrorResponse(400, 'Attribute `Account.name` has a maximum length of 255 chars, sorry…', {
                attributes: {
                    name: 'Is too long, only 255 characters allowed…'
                }
            });
        }

        model.type = body.type;
        if (this.getValidTypeValues().indexOf(model.type) === -1) {
            throw new ErrorResponse(
                400,
                'Attribute `Account.type` is invalid, must be one of: ' + this.getValidTypeValues().join(', '), {
                    attributes: {
                        name: 'Invalid value'
                    }
                });
        }

        model.number = body.number || null;
        model.hidden = !!body.hidden;

        const documentModel = await DatabaseHelper.get('document').findOne({
            where: {id: body.documentId},
            attributes: ['id'],
            include: [{
                model: DatabaseHelper.get('user'),
                attributes: [],
                where: {
                    id: options.session.userId
                }
            }]
        });

        if (!documentModel) {
            throw new ErrorResponse(401, 'Not able to create account: linked document not found.');
        }

        model.documentId = documentModel.id;
        await model.save();

        return {model};
    }

    static async get(id, options) {
        const DatabaseHelper = require('../helpers/database');
        return this.getModel().findOne({
            where: {
                id: id
            },
            include: [{
                model: DatabaseHelper.get('document'),
                attributes: ['id'],
                include: DatabaseHelper.includeUserIfNotAdmin(options.session)
            }]
        });
    }

    static async list(params, options) {
        const DatabaseHelper = require('../helpers/database');

        const sql = {
            include: [{
                model: DatabaseHelper.get('document'),
                attributes: [],
                required: true,
                include: options.session.user.isAdmin ? [] : [{
                    model: DatabaseHelper.get('user'),
                    attributes: [],
                    required: true,
                    where: {
                        id: options.session.userId
                    }
                }]
            }],
            order: [
                ['name', 'ASC']
            ]
        };

        _.each(params, (id, k) => {
            if (k === 'document') {
                sql.include[0].where = {id};
            } else {
                throw new ErrorResponse(400, 'Unknown filter `' + k + '`!');
            }
        });

        return this.getModel().findAll(sql);
    }

    static async update(model, body) {
        if (body.name !== undefined) {
            model.name = body.name;
        }
        if (!model.name) {
            throw new ErrorResponse(400, 'Account requires attribute `name`…', {
                attributes: {
                    name: 'Is required!'
                }
            });
        }
        if (model.name.length > 255) {
            throw new ErrorResponse(400, 'Attribute `Account.name` has a maximum length of 255 chars, sorry…', {
                attributes: {
                    name: 'Is too long, only 255 characters allowed…'
                }
            });
        }

        if (body.type !== null) {
            model.type = body.type;
        }
        if (this.getValidTypeValues().indexOf(model.type) === -1) {
            throw new ErrorResponse(
                400,
                'Attribute `Account.type` is invalid, must be one of: ' + this.getValidTypeValues().join(', '), {
                    attributes: {
                        name: 'Invalid value'
                    }
                });
        }

        if (body.number !== undefined && !model.pluginInstanceId) {
            model.number = body.number || null;
        }

        if (body.hidden) {
            model.hidden = !!body.hidden;
        }

        await model.save();
        return {model};
    }

    static async delete (model) {
        const DatabaseHelper = require('../helpers/database');
        if(model.pluginInstanceId) {
            throw new ErrorResponse(400, 'It\'s not allowed to destroy managed accounts.');
        }

        const firstTransaction = await DatabaseHelper.get('transaction').findOne({
            attributes: ['time'],
            where: {
                accountId: model.id
            },
            order: [['time', 'ASC']],
            limit: 1
        });

        await model.destroy();

        // Account was empty -> no need to recalculate document
        if(!firstTransaction) {
            return;
        }

        const moment = require('moment');
        const month = moment(firstTransaction.time).startOf('month');

        const PortionsLogic = require('../logic/portion');
        const SummaryLogic = require('../logic/summary');

        await PortionsLogic.recalculatePortionsFrom({month, documentId: model.documentId});
        await SummaryLogic.recalculateSummariesFrom(model.documentId, month);
    }

    /**
     * Method to manually send the `updated` event
     * for an account. As an account includes the
     * budget and the number of transactions, this
     * is required when touching transactions.
     */
    static sendUpdatedEvent (model) {
        const PluginHelper = require('../helpers/plugin');
        PluginHelper.events().emit('update', {
            action: 'updated',
            name: 'account',
            model
        });
    }
}

module.exports = AccountLogic;