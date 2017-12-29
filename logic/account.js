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
        const info = await DatabaseHelper.get('transaction').findOne({
            attributes: [
                [DatabaseHelper.sum('amount'), 'balance'],
                [DatabaseHelper.count('id'), 'transactions']
            ],
            where: {
                accountId: account.id
            }
        });

        return {
            id: account.id,
            name: account.name,
            type: account.type,
            number: account.number,
            balance: parseInt(info.dataValues.balance, 10) || 0,
            transactions: parseInt(info.dataValues.transactions, 10) || 0,
            documentId: account.documentId,
            pluginInstanceId: account.pluginInstanceId
        };
    }

    static getValidTypeValues() {
        return ['checking', 'savings', 'creditCard', 'cash', 'paypal', 'mortgage', 'asset', 'loan'];
    }

    static create(body, options) {
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

        return DatabaseHelper.get('document')
            .find({
                where: {id: body.documentId},
                attributes: ['id'],
                include: [{
                    model: DatabaseHelper.get('user'),
                    attributes: [],
                    where: {
                        id: options.session.userId
                    }
                }]
            })
            .then(function (documentModel) {
                if (!documentModel) {
                    throw new ErrorResponse(401, 'Not able to create account: linked document not found.');
                }

                model.documentId = documentModel.id;
                return model.save();
            })
            .then(function (model) {
                return {model};
            })
            .catch(e => {
                throw e;
            });
    }

    static get(id, options) {
        const DatabaseHelper = require('../helpers/database');
        return this.getModel().findOne({
            where: {
                id: id
            },
            include: [{
                model: DatabaseHelper.get('document'),
                attributes: [],
                include: options.session.user.isAdmin ? [] : [{
                    model: DatabaseHelper.get('user'),
                    attributes: [],
                    where: {
                        id: options.session.userId
                    }
                }]
            }]
        });
    }

    static list(params, options) {
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
}

module.exports = AccountLogic;