'use strict';

const _ = require('underscore');
const BaseLogic = require('./_');
const ErrorResponse = require('../helpers/errorResponse');

class TransactionLogic extends BaseLogic {
    static getModelName() {
        return 'transaction';
    }

    static getPluralModelName() {
        return 'transactions';
    }

    static format(transaction) {
        return {
            id: transaction.id,
            time: transaction.time,
            accountId: transaction.accountId,
            amount: transaction.amount,
            memo: transaction.memo,
            payeeId: transaction.payeeId,
            pluginsOwnPayeeId: transaction.pluginsOwnPayeeId,
            units: transaction.units.map(unit => {
                let budget = unit.budgetId;
                if (unit.incomeMonth === 'this') {
                    budget = 'income-0';
                }
                else if (unit.incomeMonth === 'next') {
                    budget = 'income-1';
                }

                return {
                    id: unit.id,
                    amount: unit.amount,
                    memo: unit.memo,
                    budgetId: budget,
                    transactionId: unit.transactionId
                };
            }),
            approved: transaction.approved,
            status: transaction.status,
            locationAccuracy: transaction.locationAccuracy,
            locationLatitude: transaction.locationLatitude,
            locationLongitude: transaction.locationLongitude
        };
    }

    static getValidStatusValues() {
        return ['pending', 'normal', 'cleared'];
    }

    static getValidManualStatusValues() {
        return ['pending', 'normal', 'cleared'];
    }

    static async create(body, options) {
        const moment = require('moment');
        const DatabaseHelper = require('../helpers/database');
        const model = this.getModel().build();
        let documentId;

        // date & time
        model.time = body.time;
        if (!model.time) {
            throw new ErrorResponse(400, 'Transaction requires attribute `time`…', {
                attributes: {
                    time: 'Is required!'
                }
            });
        }

        const timeMoment = moment(model.time);
        if (!timeMoment.isValid()) {
            throw new ErrorResponse(400, 'Transaction requires valid attribute `time`…', {
                attributes: {
                    time: 'Is invalid!'
                }
            });
        }


        // memo
        model.memo = body.memo || null;
        if (model.memo && model.memo.length > 255) {
            throw new ErrorResponse(400, 'Attribute `Transaction.memo` has a maximum length of 255 chars, sorry…', {
                attributes: {
                    memo: 'Is too long, only 255 characters allowed…'
                }
            });
        }


        // amount
        model.amount = parseInt(body.amount, 10) || null;
        if (isNaN(model.amount)) {
            throw new ErrorResponse(400, 'Transaction requires attribute `amount`…', {
                attributes: {
                    amount: 'Is required!'
                }
            });
        }


        // status
        model.status = body.status || 'normal';
        if (this.getValidManualStatusValues().indexOf(model.status) === -1) {
            throw new ErrorResponse(
                400,
                'Attribute `Transaction.status` is invalid, must be one of: ' + this.getValidManualStatusValues().join(', '), {
                    attributes: {
                        status: 'Invalid value'
                    }
                });
        }


        // payee
        if (body.payeeId) {
            await DatabaseHelper.get('payee')
                .findById(body.payeeId)
                .then(function (payee) {
                    if (!payee) {
                        throw new ErrorResponse(400, 'Not able to create transaction: linked payee not found.');
                    }

                    model.payeeId = payee.id;
                });
        }


        // account & units
        return DatabaseHelper.get('account')
            .find({
                where: {id: body.accountId},
                attributes: ['id'],
                include: [{
                    model: DatabaseHelper.get('document'),
                    attributes: ['id'],
                    include: [{
                        model: DatabaseHelper.get('user'),
                        attributes: [],
                        where: {
                            id: options.session.userId
                        }
                    }]
                }]
            })
            .then(function (accountModel) {
                if (!accountModel) {
                    throw new ErrorResponse(400, 'Not able to create transaction: linked account not found.');
                }
                if (accountModel.pluginId) {
                    throw new ErrorResponse(400, 'Not able to create transaction: linked account is managed by a plugin');
                }

                documentId = accountModel.document.id;
                model.accountId = accountModel.id;
                return model.save();
            })
            .then(function () {
                const unitJobs = [];
                const units = [];
                let sum = 0;

                if (body.units) {
                    body.units.forEach((unit, i) => {
                        if (!unit.budgetId && !unit.amount) {
                            return;
                        }

                        if (!unit.budgetId) {
                            throw new ErrorResponse(400, 'Not able to update transaction: unit[' + i + '] has no budgetId set', {
                                attributes: {
                                    units: 'unit[' + i + ' has no budgetId'
                                }
                            });
                        }

                        let amount = parseInt(unit.amount, 10);
                        sum += amount;
                        if (!amount) {
                            throw new ErrorResponse(400, 'Not able to update transaction: unit[' + i + '] has no amount set', {
                                attributes: {
                                    units: 'unit[' + i + ' has no amount'
                                }
                            });
                        }

                        if (unit.memo && unit.memo.length > 255) {
                            throw new ErrorResponse(400, 'Not able to update transaction: unit[' + i + '].memo is to long', {
                                attributes: {
                                    units: 'unit[' + i + '.memo is to long'
                                }
                            });
                        }


                        if (unit.budgetId === 'income-0' || unit.budgetId === 'income-1') {
                            unitJobs.push(
                                DatabaseHelper.get('unit').create({
                                    amount: unit.amount,
                                    transactionId: model.id,
                                    budgetId: null,
                                    incomeMonth: unit.budgetId === 'income-0' ? 'this' : 'next'
                                })
                                    .then(unit => {
                                        units.push(unit);
                                    })
                                    .catch(e => {
                                        throw e;
                                    })
                            );
                        } else {
                            unitJobs.push(
                                DatabaseHelper.get('unit').create({
                                    amount: unit.amount,
                                    transactionId: model.id,
                                    budgetId: unit.budgetId,
                                    incomeMonth: null
                                })
                                    .then(unit => {
                                        units.push(unit);
                                    })
                                    .catch(e => {
                                        throw e;
                                    })
                            );
                        }
                    });
                }

                if (body.units && sum !== model.amount) {
                    throw new ErrorResponse(400, 'Not able to update transaction: sum of units is not same as amount!', {
                        attributes: {
                            units: 'Does not match with amount',
                            amount: 'Does not match with units'
                        }
                    });
                }

                return Promise.all(unitJobs)
                    .then(function () {
                        model.units = units;

                        const PortionLogic = require('../logic/portion');
                        const SummaryLogic = require('../logic/summary');

                        // update portions
                        PortionLogic.recalculatePortionsFrom({
                            month: timeMoment.startOf('month'),
                            documentId: documentId
                        });

                        // update summaries
                        SummaryLogic.recalculateSummariesFrom(documentId, timeMoment.startOf('month'));

                        return model;
                    })
                    .catch(e => {
                        throw e;
                    });
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
            include: [
                {
                    model: DatabaseHelper.get('account'),
                    attributes: ['pluginInstanceId'],
                    include: [{
                        model: DatabaseHelper.get('document'),
                        attributes: ['id'],
                        include: [{
                            model: DatabaseHelper.get('user'),
                            attributes: [],
                            where: {
                                id: options.session.userId
                            }
                        }]
                    }]
                },
                {
                    model: DatabaseHelper.get('unit')
                }
            ]
        });
    }

    static list(params, options) {
        const moment = require('moment');
        const DatabaseHelper = require('../helpers/database');

        const sql = {
            include: [
                {
                    model: DatabaseHelper.get('account'),
                    attributes: [],
                    required: true,
                    include: [{
                        model: DatabaseHelper.get('document'),
                        attributes: [],
                        required: true,
                        include: [{
                            model: DatabaseHelper.get('user'),
                            attributes: [],
                            where: {
                                id: options.session.userId
                            }
                        }]
                    }]
                },
                {
                    model: DatabaseHelper.get('unit')
                }
            ],
            order: [
                ['time', 'ASC']
            ]
        };

        _.each(params, (id, k) => {
            if (k === 'month') {
                let m;

                try {
                    m = moment(id, 'YYYY-MM').startOf('month');
                }
                catch (err) {
                    throw new ErrorResponse(400, 'Unable to parse `month`: ' + err.toString());
                }
                if (!m.isValid()) {
                    throw new ErrorResponse(400, 'Unable to parse `month`: ' + m.toString());
                }

                sql.where = {
                    time: {
                        [DatabaseHelper.op('between')]: [m.startOf('month').toJSON(), m.endOf('month').toJSON()]
                    }
                };
            }
            else if (k === 'future') {
                sql.where = {
                    time: {
                        [DatabaseHelper.op('gt')]: moment().endOf('month').toJSON()
                    }
                };
            }
            else if (k === 'account') {
                sql.include[0].where = {id};
            }
            else if (k === 'document') {
                sql.include[0].include[0].where = {id};
            }
            else {
                throw new ErrorResponse(400, 'Unknown filter `' + k + '`!');
            }
        });

        return this.getModel().findAll(sql);
    }

    static update(model, body) {
        const moment = require('moment');
        const DatabaseHelper = require('../helpers/database');

        const checks = [];
        let timeMoment = moment(model.time);
        let recalculateFrom = moment(timeMoment).startOf('month');

        // Time
        if (body.time && moment(body.time).isSame(timeMoment)) {
            model.time = body.time;
            timeMoment = moment(body.time);

            if (timeMoment.isBefore(recalculateFrom)) {
                recalculateFrom = moment(timeMoment).startOf('month');
            }
        }
        if (!timeMoment.isValid()) {
            throw new ErrorResponse(400, 'Attribute `Transaction.time` seems to be invalid…', {
                attributes: {
                    time: 'Is invalid…'
                }
            });
        }

        // Memo
        if (body.memo !== undefined) {
            model.memo = body.memo;
        }
        if (model.memo && model.memo.length > 255) {
            throw new ErrorResponse(400, 'Attribute `Transaction.memo` has a maximum length of 255 chars, sorry…', {
                attributes: {
                    memo: 'Is too long, only 255 characters allowed…'
                }
            });
        }


        // Payee
        if (body.payeeId !== model.payeeId) {
            checks.push(
                DatabaseHelper.get('payee')
                    .findById(body.payeeId)
                    .then(function (payee) {
                        if (!payee) {
                            throw new ErrorResponse(400, 'Not able to create transaction: linked payee not found.');
                        }

                        model.payeeId = payee.id;
                    })
                    .catch(e => {
                        throw e;
                    })
            );
        }


        // Amount
        if (body.amount !== undefined && body.amount !== model.amount && model.account.pluginId) {
            throw new ErrorResponse(400, 'Not able to update transaction: amount can not be changed on a managed transaction!', {
                attributes: {
                    amount: 'Not allowed to change, because this transaction\'s account is managed by a plugin'
                }
            });
        }
        if (body.amount !== undefined) {
            model.amount = parseInt(body.amount, 10) || null;
        }
        if (isNaN(model.amount)) {
            throw new ErrorResponse(400, 'Transaction requires attribute `amount`…', {
                attributes: {
                    amount: 'Is required!'
                }
            });
        }


        // Status
        if (body.status !== undefined && body.status !== model.status && model.account.pluginId) {
            throw new ErrorResponse(400, 'Not able to update transaction: status can not be changed on a managed transaction!', {
                attributes: {
                    status: 'Not allowed to change, because this transaction\'s account is managed by a plugin'
                }
            });
        }
        if (body.status !== undefined) {
            model.status = body.status;
        }
        if (this.getValidManualStatusValues().indexOf(model.status) === -1) {
            throw new ErrorResponse(
                400,
                'Attribute `Transaction.status` is invalid, must be one of: ' + this.getValidManualStatusValues().join(', '), {
                    attributes: {
                        status: 'Invalid value'
                    }
                });
        }


        // Account
        if (body.accountId !== undefined && body.accountId !== model.accountId && model.account.pluginId) {
            throw new ErrorResponse(400, 'Not able to update transaction: account can not be changed on a managed transaction!', {
                attributes: {
                    accountId: 'Not allowed to change, because this transaction\'s account is managed by a plugin'
                }
            });
        }
        if (body.accountId !== undefined && body.accountId !== model.accountId) {
            checks.push(
                DatabaseHelper.get('account')
                    .find({
                        where: {id: body.accountId},
                        attributes: ['id', 'pluginId']
                    })
                    .then(function (account) {
                        if (account.pluginId) {
                            throw new ErrorResponse(400, 'Not able to update transaction: account can not be changed to a managed one!', {
                                attributes: {
                                    accountId: 'Not allowed to change, because new account is managed by a plugin'
                                }
                            });
                        }

                        model.accountId = account.id;
                        return Promise.resolve();
                    })
                    .catch(e => {
                        throw e;
                    })
            );
        }

        // Units / Budget
        if (body.units !== undefined) {
            const units = [];
            const unitJobs = [];
            let sum = 0;

            body.units.forEach((unit, i) => {
                if (!unit.budgetId && !unit.amount) {
                    return;
                }

                if (!unit.budgetId) {
                    throw new ErrorResponse(400, 'Not able to update transaction: unit[' + i + '] has no budgetId set', {
                        attributes: {
                            units: 'unit[' + i + ' has no budgetId'
                        }
                    });
                }

                let amount = parseInt(unit.amount);
                sum += amount;
                if (!amount) {
                    throw new ErrorResponse(400, 'Not able to update transaction: unit[' + i + '] has no amount set', {
                        attributes: {
                            units: 'unit[' + i + ' has no amount'
                        }
                    });
                }

                if (unit.memo && unit.memo.length > 255) {
                    throw new ErrorResponse(400, 'Not able to update transaction: unit[' + i + '].memo is to long', {
                        attributes: {
                            units: 'unit[' + i + '.memo is to long'
                        }
                    });
                }

                if (unit.id) {
                    unitJobs.push(
                        DatabaseHelper.get('unit').findOne({
                            where: {
                                id: unit.id,
                                transactionId: model.id
                            }
                        })
                            .then(unitModel => {
                                if (!unitModel) {
                                    throw new ErrorResponse(400, 'Not able to update transaction: unit[' + i + '] not found', {
                                        attributes: {
                                            units: 'unit[' + i + '.id seems to be incorrect'
                                        }
                                    });
                                }

                                unitModel.amount = unit.amount;
                                unitModel.memo = unit.memo;

                                if (unit.budgetId === 'income-0' || unit.budgetId === 'income-1') {
                                    unitModel.incomeMonth = unit.budgetId === 'income-0' ? 'this' : 'next';
                                    unitModel.budgetId = null;
                                } else {
                                    unitModel.incomeMonth = null;
                                    unitModel.budgetId = unit.budgetId;
                                }

                                units.push(unitModel);
                                return unitModel.save();
                            })
                            .catch(e => {
                                throw e;
                            })
                    );
                }
                else if (unit.budgetId === 'income-0' || unit.budgetId === 'income-1') {
                    unitJobs.push(
                        DatabaseHelper.get('unit').create({
                            amount: unit.amount,
                            transactionId: model.id,
                            budgetId: null,
                            incomeMonth: unit.budgetId === 'income-0' ? 'this' : 'next'
                        })
                            .then(unit => {
                                units.push(unit);
                            })
                            .catch(e => {
                                throw e;
                            })
                    );
                }
                else {
                    unitJobs.push(
                        DatabaseHelper.get('unit').create({
                            amount: unit.amount,
                            transactionId: model.id,
                            budgetId: unit.budgetId,
                            incomeMonth: null
                        })
                            .then(unit => {
                                units.push(unit);
                            })
                            .catch(e => {
                                throw e;
                            })
                    );
                }
            });

            if (body.units.length > 0 && sum !== model.amount) {
                throw new ErrorResponse(400, 'Not able to update transaction: sum of units is not same as amount!', {
                    attributes: {
                        units: 'Does not match with amount',
                        amount: 'Does not match with units'
                    }
                });
            }

            model.units.forEach(unitModel => {
                if (!_.find(body.units, u => u.id === unitModel.id)) {
                    unitJobs.push(unitModel.destroy());
                }
            });

            checks.push(
                Promise.all(unitJobs)
                    .then(() => {
                        model.units = units;
                    })
                    .catch(e => {
                        throw e;
                    })
            );
        }


        if (checks.length === 0) {
            return model.save();
        }

        return Promise.all(checks)
            .then(() => {
                return model.save();
            })
            .then(() => {
                const PortionLogic = require('../logic/portion');
                const SummaryLogic = require('../logic/summary');

                // update portions
                PortionLogic.recalculatePortionsFrom({
                    month: recalculateFrom,
                    documentId: model.account.document.id
                });

                // update summaries
                SummaryLogic.recalculateSummariesFrom(model.account.document.id, recalculateFrom);

                return model;
            })
            .catch(e => {
                throw e;
            });
    }

    static delete(model) {
        if (model.account.pluginId) {
            throw new ErrorResponse(400, 'Not able to destroy transaction: managed by transaction');
        }

        const moment = require('moment');
        const month = moment(model).startOf('month');
        const documentId = model.account.document.id;

        return model.destroy()
            .then(model => {
                const PortionLogic = require('../logic/portion');
                const SummaryLogic = require('../logic/summary');

                // update portions
                PortionLogic.recalculatePortionsFrom({month, documentId});

                // update summaries
                SummaryLogic.recalculateSummariesFrom(documentId, month);

                return model;
            })
            .catch(e => {
                throw e;
            });
    }
}

module.exports = TransactionLogic;