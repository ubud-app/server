'use strict';

const _ = require('underscore');
const BaseLogic = require('./_');
const LogHelper = require('../helpers/log');
const ErrorResponse = require('../helpers/errorResponse');
const log = new LogHelper('TransactionLogic');

class TransactionLogic extends BaseLogic {
    static getModelName () {
        return 'transaction';
    }

    static getPluralModelName () {
        return 'transactions';
    }

    static format (transaction) {
        return {
            id: transaction.id,
            time: transaction.time,
            accountId: transaction.accountId,
            documentId: transaction.account ? transaction.account.documentId : null,
            amount: transaction.amount,
            memo: transaction.memo,
            payeeId: transaction.payee ? transaction.payee.id : null,
            payeeName: transaction.payee ? transaction.payee.name : null,
            pluginsOwnPayeeId: transaction.pluginsOwnPayeeId,
            pluginsOwnMemo: transaction.pluginsOwnMemo,
            units: (transaction.units || []).map(unit => ({
                id: unit.id,
                amount: unit.amount,
                type: unit.type,
                memo: unit.memo,
                budgetId: unit.budgetId,
                transferAccountId: unit.transferAccountId
            })),
            approved: transaction.approved,
            status: transaction.status,
            reconciling: transaction.isReconciling,
            locationAccuracy: transaction.locationAccuracy || null,
            locationLatitude: transaction.locationLatitude || null,
            locationLongitude: transaction.locationLongitude || null
        };
    }

    static getValidStatusValues () {
        return ['pending', 'normal', 'cleared'];
    }

    static getValidManualStatusValues () {
        return ['pending', 'normal', 'cleared'];
    }

    static async create (body, options) {
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
        if (isNaN(model.amount) || (model.amount === 0 && !body.reconcile)) {
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
                .findByPk(body.payeeId)
                .then(function (payee) {
                    if (!payee) {
                        throw new ErrorResponse(400, 'Not able to create transaction: linked payee not found.');
                    }

                    model.payeeId = payee.id;
                });
        }


        // location
        if (body.locationLatitude && !body.locationLongitude) {
            throw new ErrorResponse(
                400,
                'Attribute `Transaction.locationLongitude` is missing', {
                    attributes: {
                        locationLongitude: 'Is missing'
                    }
                });
        }
        else if (!body.locationLatitude && body.locationLongitude) {
            throw new ErrorResponse(
                400,
                'Attribute `Transaction.locationLatitude` is missing', {
                    attributes: {
                        locationLatitude: 'Is missing'
                    }
                });
        }
        else if (body.locationLatitude && body.locationLongitude) {
            model.locationLatitude = body.locationLatitude;
            model.locationLongitude = body.locationLongitude;
        }


        // Accuracy
        if (body.locationAccuracy && body.locationAccuracy > 0) {
            model.locationAccuracy = Math.round(body.locationAccuracy);
        }


        // Approved Flag
        if (body.approved) {
            model.approved = true;
        }


        // account
        const accountModel = await DatabaseHelper.get('account').findOne({
            where: {id: body.accountId},
            attributes: ['id', 'pluginInstanceId'],
            include: [{
                model: DatabaseHelper.get('document'),
                attributes: ['id'],
                required: true,
                include: DatabaseHelper.includeUserIfNotAdmin(options.session)
            }]
        });

        if (!accountModel) {
            throw new ErrorResponse(400, 'Not able to create transaction: linked account not found.');
        }
        if (accountModel.pluginInstanceId) {
            throw new ErrorResponse(400, 'Not able to create transaction: linked account is managed by a plugin');
        }

        documentId = accountModel.document.id;
        model.accountId = accountModel.id;
        model.isReconciling = true;


        // units
        if (body.reconcile) {
            if (model.amount !== null) {
                const lastReconcileTransaction = await this.getModel().findOne({
                    where: {
                        accountId: model.accountId,
                        isReconciling: true
                    },
                    include: [
                        {
                            model: DatabaseHelper.get('unit')
                        }
                    ],
                    order: [['time', 'DESC']],
                    limit: 1
                });

                model.status = 'cleared';
                await model.save();

                if (lastReconcileTransaction && lastReconcileTransaction.units.length === 1) {
                    const unitModel = DatabaseHelper.get('unit').build();
                    unitModel.transactionId = model.id;
                    unitModel.amount = model.amount;
                    unitModel.type = lastReconcileTransaction.units[0].type;
                    unitModel.budgetId = lastReconcileTransaction.units[0].budgetId;
                    unitModel.transferAccountId = lastReconcileTransaction.units[0].transferAccountId;
                    await unitModel.save();
                    model.units = [unitModel];
                }
            }

            const transactions = await this.getModel().findAll({
                where: {
                    time: {
                        [DatabaseHelper.op('lte')]: model.time
                    },
                    status: 'normal'
                }
            });

            // don't use TransactionModel.update() to trigger events
            await Promise.all(transactions.map(transaction => {
                transaction.status = 'cleared';
                return transaction.save();
            }));

            if (model.amount === null) {
                return {model: {}};
            }
        }
        else if (body.units) {
            const unitJobs = [];
            let sum = 0;

            await Promise.all(body.units.map(async (unit, i) => {
                const unitModel = DatabaseHelper.get('unit').build();

                // ignore empty units
                if (!unit.budgetId && !unit.amount) {
                    return;
                }

                let amount = parseInt(unit.amount, 10);
                unitModel.amount = amount;
                sum += amount;
                if (!amount) {
                    throw new ErrorResponse(400, 'Not able to update transaction: unit[' + i + '] has no amount set', {
                        attributes: {
                            units: 'unit[' + i + ' has no amount'
                        }
                    });
                }

                unitModel.memo = unit.memo || null;
                if (unitModel.memo && unitModel.memo.length > 255) {
                    throw new ErrorResponse(400, 'Not able to update transaction: unit[' + i + '].memo is to long', {
                        attributes: {
                            units: 'unit[' + i + '.memo is to long'
                        }
                    });
                }

                if (typeof unit.type === 'string' && unit.type.toUpperCase() === 'INCOME') {
                    unitModel.type = 'INCOME';
                    unitModel.budgetId = null;
                }
                else if (typeof unit.type === 'string' && unit.type.toUpperCase() === 'INCOME_NEXT') {
                    unitModel.type = 'INCOME_NEXT';
                    unitModel.budgetId = null;
                }
                else if (typeof unit.type === 'string' && unit.transferAccountId) {
                    const AccountLogic = require('./account');
                    const transferAccount = await AccountLogic.get(unit.transferAccountId, options);
                    if (!transferAccount || accountModel.document.id !== transferAccount.document.id) {
                        throw new ErrorResponse(400, 'Not able to update transaction: unit[' + i + '] has invalid transferAccountId', {
                            attributes: {
                                units: 'unit[' + i + '] has invalid transferAccountId'
                            }
                        });
                    }

                    unitModel.type = 'TRANSFER';
                    unitModel.transferAccountId = unit.transferAccountId;
                }
                else if (unit.budgetId) {
                    const BudgetLogic = require('./budget');
                    const budget = await BudgetLogic.get(unit.budgetId, options);
                    if (!budget || accountModel.document.id !== budget.category.document.id) {
                        throw new ErrorResponse(400, 'Not able to update transaction: unit[' + i + '] has invalid budgetId', {
                            attributes: {
                                units: 'unit[' + i + '] has invalid budgetId'
                            }
                        });
                    }

                    unitModel.type = 'BUDGET';
                    unitModel.budgetId = budget.id;
                }
                else {
                    throw new ErrorResponse(
                        400,
                        'Not able to update transaction: unit[' + i + '] has no valid type or budgetId set',
                        {
                            attributes: {
                                units: 'unit[' + i + ' has no budgetId'
                            }
                        }
                    );
                }

                unitJobs.push(() => {
                    unitModel.transactionId = model.id;
                    return unitModel.save();
                });
            }));

            if (body.units.length > 0 && sum !== model.amount) {
                throw new ErrorResponse(400, 'Not able to update transaction: sum of units is not same as amount!', {
                    attributes: {
                        units: 'Does not match with amount',
                        amount: 'Does not match with units'
                    }
                });
            }

            await model.save();

            // start promises
            model.units = await Promise.all(unitJobs.map(e => e()));
        }
        else {
            await model.save();
        }


        const lastJobs = [
            this.updateLearnings(model)
        ];

        // update portions
        const PortionLogic = require('../logic/portion');
        lastJobs.push(
            PortionLogic.recalculatePortionsFrom({
                month: timeMoment.startOf('month'),
                documentId: documentId
            })
        );

        // update summaries
        const SummaryLogic = require('../logic/summary');
        lastJobs.push(
            SummaryLogic.recalculateSummariesFrom(documentId, timeMoment.startOf('month'))
        );

        // update account balance
        const AccountLogic = require('./account');
        if (model.units && model.units.find(u => u.type === 'TRANSFER')) {
            lastJobs.push((async () => {
                const accounts = await AccountLogic.list({}, options);
                await Promise.all(accounts.map(a => AccountLogic.sendUpdatedEvent(a)));
            })());
        }
        else {
            lastJobs.push((async () => {
                const account = await model.getAccount();
                await AccountLogic.sendUpdatedEvent(account);
            })());
        }


        await Promise.all(lastJobs);
        return {model};
    }

    static async get (id, options = {}) {
        const DatabaseHelper = require('../helpers/database');
        return this.getModel().findOne({
            where: {
                id: id
            },
            include: [
                {
                    model: DatabaseHelper.get('account'),
                    attributes: ['pluginInstanceId', 'documentId'],
                    include: [{
                        model: DatabaseHelper.get('document'),
                        attributes: ['id'],
                        include: options.session ? [{
                            model: DatabaseHelper.get('user'),
                            attributes: ['id'],
                            where: {
                                id: options.session.userId
                            }
                        }] : []
                    }]
                },
                {
                    model: DatabaseHelper.get('unit')
                },
                {
                    model: DatabaseHelper.get('payee'),
                    attribute: ['id', 'name']
                }
            ]
        });
    }

    static async list (params, options) {
        const moment = require('moment');
        const DatabaseHelper = require('../helpers/database');

        const sql = {
            include: [
                {
                    model: DatabaseHelper.get('account'),
                    attributes: ['documentId'],
                    required: true,
                    include: [{
                        model: DatabaseHelper.get('document'),
                        attributes: [],
                        required: true,
                        include: DatabaseHelper.includeUserIfNotAdmin(options.session)
                    }]
                },
                {
                    model: DatabaseHelper.get('unit')
                },
                {
                    model: DatabaseHelper.get('payee')
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
            else if (k === 'status') {
                sql.where = sql.where || {};
                sql.where.status = id;
            }
            else {
                throw new ErrorResponse(400, 'Unknown filter `' + k + '`!');
            }
        });

        return this.getModel().findAll(sql);
    }

    static async update (model, body, options) {
        const moment = require('moment');
        const DatabaseHelper = require('../helpers/database');

        let timeMoment = moment(model.time);
        let recalculateFrom = null;

        // Time
        if (body.time && !moment(body.time).isSame(timeMoment)) {
            model.time = body.time;
            timeMoment = moment(body.time);

            if (timeMoment.isBefore(recalculateFrom)) {
                recalculateFrom = moment(timeMoment).startOf('month');
            }
            else {
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
            const PayeeLogic = require('./payee');
            const payee = await PayeeLogic.get(body.payeeId, {session: options.session});
            if (!payee) {
                throw new ErrorResponse(400, 'Not able to create transaction: linked payee not found.');
            }

            model.payeeId = payee.id;
            model.payee = payee;
        }


        // Amount
        if (body.amount !== undefined && body.amount !== model.amount && model.account.pluginInstanceId) {
            throw new ErrorResponse(400, 'Not able to update transaction: amount can not be changed on a managed transaction!', {
                attributes: {
                    amount: 'Not allowed to change, because this transaction\'s account is managed by a plugin'
                }
            });
        }
        if (body.amount !== undefined && model.amount !== (parseInt(body.amount, 10) || null)) {
            model.amount = parseInt(body.amount, 10) || null;

            if (!recalculateFrom) {
                recalculateFrom = moment(timeMoment).startOf('month');
            }
        }
        if (isNaN(model.amount)) {
            throw new ErrorResponse(400, 'Transaction requires attribute `amount`…', {
                attributes: {
                    amount: 'Is required!'
                }
            });
        }


        // Status
        if (body.status !== undefined && body.status !== model.status && model.account.pluginInstanceId) {
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


        // location
        if (body.locationLatitude && !body.locationLongitude) {
            throw new ErrorResponse(
                400,
                'Attribute `Transaction.locationLongitude` is missing', {
                    attributes: {
                        locationLongitude: 'Is missing'
                    }
                });
        }
        else if (!body.locationLatitude && body.locationLongitude) {
            throw new ErrorResponse(
                400,
                'Attribute `Transaction.locationLatitude` is missing', {
                    attributes: {
                        locationLatitude: 'Is missing'
                    }
                });
        }
        else if (body.locationLatitude && body.locationLongitude) {
            model.locationLatitude = body.locationLatitude;
            model.locationLongitude = body.locationLongitude;
        }


        // Accuracy
        if (body.locationAccuracy && body.locationAccuracy > 0) {
            model.locationAccuracy = Math.round(body.locationAccuracy);
        }


        // Approved Flag
        if (body.approved !== undefined) {
            model.approved = !!body.approved;
        }


        // Account
        if (body.accountId !== undefined && body.accountId !== model.accountId && model.account.pluginInstanceId) {
            throw new ErrorResponse(400, 'Not able to update transaction: account can not be changed on a managed transaction!', {
                attributes: {
                    accountId: 'Not allowed to change, because this transaction\'s account is managed by a plugin'
                }
            });
        }
        if (body.accountId !== undefined && body.accountId !== model.accountId) {
            const AccountLogic = require('./account');
            const accountModel = await AccountLogic.get(body.accountId, options);
            if (!accountModel) {
                throw new ErrorResponse(400, 'Not able to update transaction: account can not be changed to a non existing one!', {
                    attributes: {
                        accountId: 'Not allowed to change, because new account not existing'
                    }
                });
            }
            if (accountModel.pluginInstanceId) {
                throw new ErrorResponse(400, 'Not able to update transaction: account can not be changed to a managed one!', {
                    attributes: {
                        accountId: 'Not allowed to change, because new account is managed by a plugin'
                    }
                });
            }

            model.accountId = accountModel.id;

            if (!recalculateFrom) {
                recalculateFrom = moment(timeMoment).startOf('month');
            }
        }

        // units
        if (body.units) {
            const unitJobs = [];
            let sum = 0;

            await Promise.all(body.units.map(async (unit, i) => {
                let unitModel = DatabaseHelper.get('unit').build();
                if (unit.id) {
                    unitModel = await DatabaseHelper.get('unit').findOne({
                        where: {
                            id: unit.id,
                            transactionId: model.id
                        }
                    });
                    if (!unitModel) {
                        throw new ErrorResponse(400, 'Not able to update transaction: unit[' + i + '] not found', {
                            attributes: {
                                units: 'unit[' + i + '.id seems to be incorrect'
                            }
                        });
                    }
                }

                // ignore empty units
                if (!unit.id && !unit.budgetId && !unit.amount) {
                    return;
                }

                // amount
                if (unit.amount !== undefined) {
                    let amount = parseInt(unit.amount, 10);
                    sum += amount;

                    if (!amount) {
                        throw new ErrorResponse(400, 'Not able to update transaction: unit[' + i + '] has no amount set', {
                            attributes: {
                                units: 'unit[' + i + ' has no amount'
                            }
                        });
                    }

                    if (unit.amount !== unitModel.amount) {
                        unitModel.amount = unit.amount;

                        if (!recalculateFrom) {
                            recalculateFrom = moment(timeMoment).startOf('month');
                        }
                    }
                }

                // memo
                if (unit.memo !== undefined) {
                    unitModel.memo = unit.memo || null;
                    if (unitModel.memo && unitModel.memo.length > 255) {
                        throw new ErrorResponse(400, 'Not able to update transaction: unit[' + i + '].memo is to long', {
                            attributes: {
                                units: 'unit[' + i + '.memo is to long'
                            }
                        });
                    }
                }

                if (typeof unit.type === 'string' && unit.type.toUpperCase() === 'INCOME') {
                    unitModel.type = 'INCOME';
                    unitModel.budgetId = null;
                }
                else if (typeof unit.type === 'string' && unit.type.toUpperCase() === 'INCOME_NEXT') {
                    unitModel.type = 'INCOME_NEXT';
                    unitModel.budgetId = null;
                }
                else if (typeof unit.type === 'string' && unit.transferAccountId) {
                    const AccountLogic = require('./account');

                    const ownAccount = await AccountLogic.get(model.accountId, options);
                    const transferAccount = await AccountLogic.get(unit.transferAccountId, options);

                    if (!transferAccount || ownAccount.document.id !== transferAccount.document.id) {
                        throw new ErrorResponse(400, 'Not able to update transaction: unit[' + i + '] has invalid transferAccountId', {
                            attributes: {
                                units: 'unit[' + i + '] has invalid transferAccountId'
                            }
                        });
                    }

                    unitModel.type = 'TRANSFER';
                    unitModel.transferAccountId = unit.transferAccountId;
                }
                else if (unit.budgetId && unit.budgetId !== unitModel.budgetId) {
                    const BudgetLogic = require('./budget');
                    const budget = await BudgetLogic.get(unit.budgetId, options);

                    const AccountLogic = require('./account');
                    const account = await AccountLogic.get(model.accountId, options);

                    if (!budget || account.document.id !== budget.category.document.id) {
                        throw new ErrorResponse(400, 'Not able to update transaction: unit[' + i + '] has invalid budgetId', {
                            attributes: {
                                units: 'unit[' + i + '] has invalid budgetId'
                            }
                        });
                    }

                    unitModel.type = 'BUDGET';
                    unitModel.budgetId = budget.id;
                }
                else if (!unit.budgetId) {
                    throw new ErrorResponse(
                        400,
                        'Not able to update transaction: unit[' + i + '] has no valid type or budgetId set',
                        {
                            attributes: {
                                units: 'unit[' + i + ' has no budgetId',
                                unit
                            }
                        }
                    );
                }

                if (!recalculateFrom) {
                    recalculateFrom = moment(timeMoment).startOf('month');
                }

                unitJobs.push(() => {
                    unitModel.transactionId = model.id;
                    return unitModel.save();
                });
            }));

            if (body.units.length > 0 && sum !== model.amount) {
                throw new ErrorResponse(400, 'Not able to update transaction: sum of units is not same as amount!', {
                    attributes: {
                        units: 'Does not match with amount',
                        amount: 'Does not match with units'
                    }
                });
            }

            await model.save();

            // delete old units
            await Promise.all(model.units.map(unitModel => {
                if (!_.find(body.units, u => u.id === unitModel.id)) {
                    return unitModel.destroy();
                }

                return Promise.resolve();
            }));

            // start promises
            model.units = await Promise.all(unitJobs.map(e => e()));
        }
        else {
            await model.save();
        }


        const lastJobs = [
            this.updateLearnings(model)
        ];

        // update portions
        if (recalculateFrom !== null) {
            const PortionLogic = require('../logic/portion');
            lastJobs.push(
                PortionLogic.recalculatePortionsFrom({
                    month: recalculateFrom,
                    documentId: model.account.document.id
                })
            );
        }

        // update summaries
        if (recalculateFrom !== null) {
            const SummaryLogic = require('../logic/summary');
            lastJobs.push(
                SummaryLogic.recalculateSummariesFrom(model.account.document.id, recalculateFrom)
            );
        }

        // update account balance
        if (model.units.find(u => u.type === 'TRANSFER')) {
            lastJobs.push((async () => {
                const AccountLogic = require('./account');
                const accounts = await AccountLogic.list({}, options);

                accounts.forEach(a => AccountLogic.sendUpdatedEvent(a));
            })());
        }
        else {
            lastJobs.push((async () => {
                const AccountLogic = require('./account');
                const account = await model.getAccount();
                AccountLogic.sendUpdatedEvent(account);
            })());
        }


        await Promise.all(lastJobs);
        return {model};
    }

    static async delete (model, options) {
        if (model.account.pluginInstanceId) {
            throw new ErrorResponse(400, 'Not able to destroy transaction: managed by transaction');
        }

        const moment = require('moment');
        const month = moment(model).startOf('month');
        const documentId = model.account.document.id;

        await model.destroy();


        // update portions
        const PortionLogic = require('../logic/portion');
        PortionLogic.recalculatePortionsFrom({month, documentId});

        // update summaries
        const SummaryLogic = require('../logic/summary');
        SummaryLogic.recalculateSummariesFrom(documentId, month);

        // update account balance
        const AccountLogic = require('./account');
        if (model.units.find(u => u.type === 'TRANSFER')) {
            const accounts = await AccountLogic.list({}, options);
            accounts.forEach(a => AccountLogic.sendUpdatedEvent(a));
        }
        else {
            const account = await model.getAccount();
            AccountLogic.sendUpdatedEvent(account);
        }

        return model;
    }

    static async updateLearnings (transaction) {
        const DatabaseHelper = require('../helpers/database');
        const models = await DatabaseHelper.get('learning').findAll({
            where: {
                transactionId: transaction.id
            }
        });

        const promises = [];
        let learnings = [];
        if (transaction.units && transaction.units.length) {
            learnings = await TransactionLogic.generateLearnings(transaction);
            learnings = learnings.filter(l => l.budgetId);
        }

        // remove items
        models.filter(model =>
            !learnings.find(learning =>
                learning.location === model.location &&
                learning.documentId === model.documentId &&
                learning.transactionId === model.transactionId &&
                learning.word === model.word
            )
        ).forEach(remove => {
            promises.push(remove.destroy());
        });

        // add items
        learnings.filter(learning =>
            !models.find(model =>
                learning.location === model.location &&
                learning.documentId === model.documentId &&
                learning.transactionId === model.transactionId &&
                learning.word === model.word
            )
        ).forEach(add => {
            promises.push(DatabaseHelper.get('learning').create(add));
        });

        await Promise.all(promises);
    }

    static async generateLearnings (transaction) {
        const result = [];
        const crypto = require('crypto');

        let documentId = null;
        if (transaction.account && transaction.account.documentId) {
            documentId = transaction.account.documentId;
        }
        if (!documentId && transaction.account && transaction.account.document && transaction.account.document.id) {
            documentId = transaction.account.document.id;
        }
        if (!documentId) {
            const fullTransaction = await TransactionLogic.get(transaction.id);
            documentId = fullTransaction.account.documentId;
        }
        if (!documentId) {
            return [];
        }

        const add = (location, value) => {
            const words = value
                .trim()
                .toLowerCase()
                .replace(/[^[a-zA-Z0-9]/, ' ')
                .split(' ');

            words.forEach(word => {
                if (!word) {
                    return;
                }

                const hash = crypto.createHash('md5')
                    .update(word)
                    .digest('hex');

                if (result.find(l =>
                    l.location === location &&
                    l.word === hash &&
                    l.transactionId === transaction.id
                )) {
                    return;
                }

                result.push({
                    location,
                    documentId,
                    budgetId: transaction.units && transaction.units.length ? transaction.units[0].budgetId : null,
                    transactionId: transaction.id,
                    word: hash
                });
            });
        };

        // payee
        if (transaction.payee && transaction.payee.name) {
            add('payee', transaction.payee.name);
        }

        // memo
        if (transaction.memo) {
            add('memo', transaction.memo);
        }

        // plugin:payee
        if (transaction.pluginsOwnPayeeId) {
            add('plugin:payee', transaction.pluginsOwnPayeeId);
        }

        // plugin:memo
        if (transaction.pluginsOwnMemo) {
            add('plugin:memo', transaction.pluginsOwnMemo);
        }

        return result;
    }

    static async guessBudget (transaction) {
        const DatabaseHelper = require('../helpers/database');
        const locationFactors = {
            'plugin:payee': 1,
            'plugin:memo': 0.4,
            'payee': 0.7,
            'memo': 0.2
        };

        const learnings = await TransactionLogic.generateLearnings(transaction);
        const merged = [];

        // check exact match
        if(transaction.payeeId || transaction.pluginsOwnPayeeId) {
            const where = {
                id: {
                    [DatabaseHelper.op('not')]: transaction.id
                },
                accountId: transaction.accountId
            };
            if(transaction.payeeId) {
                where.payeeId = transaction.payeeId;
            }
            else if(transaction.pluginsOwnPayeeId) {
                where.pluginsOwnPayeeId = transaction.pluginsOwnPayeeId;
            }

            const budgetIds = [];
            const exactModels = await this.getModel().findAll({
                where,
                attributes: ['id', 'updatedAt'],
                order: [['updatedAt', 'DESC']],
                limit: 2,
                include: [{
                    model: DatabaseHelper.get('unit')
                }]
            });
            exactModels.forEach(transaction => {
                transaction.units.forEach(unit => {
                    if(unit.type === 'BUDGET' && !budgetIds.includes(unit.budgetId)) {
                        budgetIds.push(unit.budgetId);
                    }
                });
            });
            if(budgetIds.length === 1) {
                const budget = await DatabaseHelper.get('budget').findByPk(budgetIds[0]);
                merged.push({
                    budgetId: budget.id,
                    budgetName: budget.name,
                    probability: 1
                });
            }
        }

        const learningModels = await DatabaseHelper.get('learning').findAll({
            attributes: [
                'budgetId',
                'location',
                'word',
                [DatabaseHelper.count('*'), 'learningUsages'],
                [
                    DatabaseHelper.literal(
                        '(SELECT COUNT(*) ' +
                        'FROM learnings AS i ' +
                        'WHERE i.location = learning.location AND i.budgetId = learning.budgetId)'
                    ),
                    'budgetUsages'
                ],
                [
                    DatabaseHelper.literal(
                        '(COUNT(*) / (SELECT COUNT(*) ' +
                        'FROM learnings AS i ' +
                        'WHERE i.location = learning.location AND i.budgetId = learning.budgetId))'
                    ),
                    'ratio'
                ]
            ],
            include: [
                {
                    model: DatabaseHelper.get('budget'),
                    attributes: ['id', 'name'],
                    required: true,
                    where: {
                        hidden: 0
                    }
                }
            ],
            where: {
                [DatabaseHelper.op('or')]: learnings.map(learning => ({
                    location: learning.location,
                    word: learning.word
                })),
                documentId: transaction.account.documentId
            },
            group: ['budgetId', 'location', 'word'],
            order: [[DatabaseHelper.literal('ratio'), 'DESC']],
            limit: 10
        });
        learningModels.forEach(model => {
            let m = merged.find(j => j.budgetId === model.budgetId);
            if (!m) {
                m = {
                    budgetId: model.budgetId,
                    budgetName: model.budget.name,
                    probability: 0
                };
                merged.push(m);
            }


            m.probability += Math.sin(model.dataValues.learningUsages / model.dataValues.budgetUsages) *
                (locationFactors[model.location] || 0.25) / 4;
        });

        merged.sort((a, b) => b.probability - a.probability);
        if (merged.length > 5) {
            merged.splice(5, merged.length - 5);
        }

        return merged;
    }

    /**
     * Sync multiple transactions with the given account.
     * Usable for both managed and manual accounts. It's
     * required to serve all transactions for a given time-
     * frame, otherwise missing transactions are removed in
     * the system!
     *
     * @param {Model} account AccountModel
     * @param {Array<Model>} transactions TransactionModels
     * @param {object} [options]
     * @param {boolean} [options.updateSummaries]
     * @returns {Promise<Array<Model>>}
     */
    static async syncTransactions (account, transactions, options = {}) {
        const moment = require('moment');
        const SummaryLogic = require('./summary');
        const DatabaseHelper = require('../helpers/database');

        log.debug('Syncing account ' + account.id + '…');

        if (!transactions.length) {
            log.debug('No transactions given, done…');
            return [];
        }

        const newTransactions = [];
        for (let i = 0; i < transactions.length; i++) {
            const transaction = await this.syncTransaction(transactions[i], transactions);
            if (transaction) {
                newTransactions.push(transaction);
            }
        }

        const minDate = moment(Math.min.apply(null, transactions.map(t => moment(t.time).valueOf())));
        const maxDate = moment(Math.max.apply(null, transactions.map(t => moment(t.time).valueOf())));
        log.debug('Got transaction beginning from ' + minDate.toJSON() + ' to ' + maxDate.toJSON());

        // destroy lost transactions
        const toDestroy = await this.getModel().findAll({
            where: {
                time: {
                    [DatabaseHelper.op('gte')]: minDate.toJSON(),
                    [DatabaseHelper.op('lte')]: maxDate.toJSON()
                },
                id: {
                    [DatabaseHelper.op('notIn')]: newTransactions.map(t => t.id)
                },
                accountId: account.id
            }
        });
        await Promise.all(toDestroy.map(async transaction => {
            if (transaction.isReconciling) {
                return Promise.resolve();
            }

            log.debug('Transaction obsolete, delete it: ' + JSON.stringify(transaction.dataValues));
            return transaction.destroy();
        }));

        // update summaries
        if (options.updateSummaries !== false) {
            await SummaryLogic.recalculateSummariesFrom(account.documentId, minDate);
        }

        const AccountLogic = require('./account');
        AccountLogic.sendUpdatedEvent(account);

        log.debug('Syncing of account ' + account.id + ' done!');

        return newTransactions;
    }

    static async syncTransaction (reference, allTransactions) {
        const moment = require('moment');
        const DatabaseHelper = require('../helpers/database');
        const log = new LogHelper('TransactionLogic.syncTransaction');
        const jobs = [];

        log.debug('Sync transaction: ' + JSON.stringify(reference));

        // check input for required fields
        ['time', 'amount', 'accountId'].forEach(attr => {
            if (!reference[attr]) {
                throw new Error('Unable to sync transaction: attribute `' + attr + '` empty!');
            }
        });

        // check accountId
        const account = await DatabaseHelper.get('account').findByPk(reference.accountId);
        if(!account) {
            throw new Error('Unable to sync transaction: attribute `accountId` invalid!');
        }

        // find transaction model
        let newTransaction;
        if (reference.pluginsOwnId) {
            log.debug('Try to find transaction by pluginsOwnId');
            newTransaction = await this.getModel().findOne({
                where: {
                    accountId: reference.accountId,
                    pluginsOwnId: reference.pluginsOwnId
                }
            });
        }

        /*  model not found: try to find matching TransactionModel which
         *    - is newer than the oldest transaction in plugin's list
         *    - is not in the plugin's list, but in our database (pluginsOwnId / accountId)
         *    - has same pluginsOwnPayeeId
         *    - amount is about tha same (+/- 10%)
         *  if exactly one found:
         *    - use that model
         *    - pluginsOwnPayeeId will be updated below
         *  else:
         *    - do nothing                                                   */
        if (!newTransaction && reference.pluginsOwnId) {
            log.debug('Try to find transaction by pluginsOwnId soft matching');
            const matchCandiates = await TransactionLogic.getModel().findAll({
                where: {
                    time: {
                        [DatabaseHelper.op('gt')]: moment(
                            Math.min.apply(null, allTransactions.map(
                                t => moment(t.time).valueOf()
                            ))
                        ).toJSON(),
                        [DatabaseHelper.op('lt')]: moment(
                            Math.max.apply(null, allTransactions.map(
                                t => moment(t.time).valueOf()
                            ))
                        ).toJSON(),
                        [DatabaseHelper.op('gte')]: moment(reference.time).startOf('day').toJSON(),
                        [DatabaseHelper.op('lte')]: moment(reference.time).add(1, 'day').endOf('day').toJSON()
                    },
                    pluginsOwnId: {
                        [DatabaseHelper.op('notIn')]: allTransactions.map(t => t.pluginsOwnId)
                    },
                    accountId: reference.accountId,
                    pluginsOwnPayeeId: reference.pluginsOwnPayeeId,
                    amount: {
                        [DatabaseHelper.op('between')]: [
                            reference.amount * (reference.amount >= 0 ? 0.9 : 1.1),
                            reference.amount * (reference.amount >= 0 ? 1.1 : 0.9)
                        ]
                    }
                }
            });

            log.debug(matchCandiates.length + ' candidates found');

            if (matchCandiates.length === 1) {
                log.debug('Procceed with this one: ' + JSON.stringify(matchCandiates[0].dataValues));

                newTransaction = matchCandiates[0];
                newTransaction.pluginsOwnId = reference.pluginsOwnId;
            }
        }

        /* Fallback matching without ID, match by amount, time and PayeeID
         * Mainly used für manual imports…
         */
        if (!newTransaction && !reference.pluginsOwnId) {
            log.debug('Try to find transaction by amount, time, accountId payeeId');

            const matchCandiates = await TransactionLogic.getModel().findAll({
                where: {
                    amount: reference.amount,
                    time: moment(reference.time).toJSON(),
                    pluginsOwnPayeeId: reference.pluginsOwnPayeeId,
                    accountId: reference.accountId
                }
            });

            log.debug(matchCandiates.length + ' candidates found');

            if (matchCandiates.length === 1) {
                log.debug('Procceed with this one: ' + JSON.stringify(matchCandiates[0].dataValues));
                newTransaction = matchCandiates[0];
            }
        }

        /* Fallback matching without ID, match by amount and time only
         * Mainly used für manual imports…
         */
        if (!newTransaction && !reference.pluginsOwnId) {
            log.debug('Try to find transaction by amount, time and accountId');

            const matchCandiates = await TransactionLogic.getModel().findAll({
                where: {
                    amount: reference.amount,
                    time: moment(reference.time).toJSON(),
                    accountId: reference.accountId
                }
            });

            log.debug(matchCandiates.length + ' candidates found');

            if (matchCandiates.length === 1) {
                log.debug('Procceed with this one: ' + JSON.stringify(matchCandiates[0].dataValues));

                newTransaction = matchCandiates[0];
                newTransaction.pluginsOwnPayeeId = reference.pluginsOwnPayeeId;
            }
        }

        // create new transaction model if not already there
        if (!newTransaction) {
            log.debug('Create new transaction model');

            newTransaction = TransactionLogic.getModel().build({
                accountId: reference.accountId,
                pluginsOwnId: reference.pluginsOwnId,
                memo: reference.memo,
                amount: reference.amount,
                time: moment(reference.time).toJSON(),
                pluginsOwnPayeeId: reference.payeeId,
                status: reference.status,
                pluginsOwnMemo: reference.pluginsOwnMemo
            });
        }

        newTransaction.amount = reference.amount;
        newTransaction.time = moment(reference.time).toJSON();
        newTransaction.pluginsOwnPayeeId = reference.pluginsOwnPayeeId;
        newTransaction.status = reference.status || 'normal';
        newTransaction.pluginsOwnMemo = reference.pluginsOwnMemo;


        // pluginsOwnPayeeId but no Payee set: maybe we can find one?
        if (newTransaction.pluginsOwnPayeeId && !newTransaction.payeeId) {
            jobs.push((async () => {
                log.debug('Try to find payee for this transaction');

                // get transactions with matching payeeId
                const payees = await DatabaseHelper.get('transaction').findAll({
                    attributes: [
                        [DatabaseHelper.count('*'), 'count'],
                        'payeeId'
                    ],
                    where: {
                        documentId: account.documentId,
                        pluginsOwnPayeeId: newTransaction.pluginsOwnPayeeId,
                        payeeId: {
                            [DatabaseHelper.op('not')]: null
                        }
                    },
                    group: ['payeeId'],
                    order: [[DatabaseHelper.literal('count'), 'DESC']],
                    raw: true
                });

                log.debug(payees.length + ' payeed found, find best one');

                // use most used payeeId for our new transaction
                const best = {count: 0, id: null, sum: 0};
                payees.forEach(payee => {
                    if (payee.count > best.count) {
                        best.count = payee.count;
                        best.id = payee.payeeId;
                        best.sum += payee.count;
                    }
                });

                if (best.id && (best.count >= 3 || payees.length === 1)) {
                    log.debug('Use payee#' + best.id + ' as payee');
                    newTransaction.payeeId = best.id;
                }
                else {
                    log.debug('No unique payee found (' + JSON.stringify(best) + ')');
                }
            })());
        }

        // Ask plugins to add metadata
        jobs.push((async () => {
            const PluginHelper = require('../helpers/plugin');
            const allPlugins = await PluginHelper.listPlugins();
            const allMetadataPlugins = allPlugins.filter(p => p.supported().includes('getMetadata'));

            return Promise.all(allMetadataPlugins.map(async plugin => {
                try {
                    log.debug('Run metadata plugin: ' + plugin.type());
                    return await plugin.getMetadata(newTransaction);
                }
                catch (err) {
                    log.info('Unable to load metadata: %s', err.toString());
                    log.warn(err);
                }
            }));
        })());

        await Promise.all(jobs);

        // check units and add unit with difference when necessary
        if (newTransaction.id) {
            const units = await newTransaction.getUnits();
            if (units.length === 1 && units[0].amount !== newTransaction.amount) {
                units[0].amount = newTransaction.amount;
                await units[0].save();
            }
            else if (units.length > 1) {
                const diff = newTransaction.amount - units.reduce((a, b) => a + b.amount, 0);

                if (diff !== 0) {
                    const unit = await DatabaseHelper.get('unit').create({
                        transactionId: newTransaction.id,
                        amount: diff,
                        type: null
                    });

                    await newTransaction.addUnit(unit);
                }
            }
        }

        try {
            log.debug('Save transaction: ' + JSON.stringify(newTransaction.dataValues));
            await newTransaction.save();
        }
        catch (err) {
            log.error('Unable to sync transaction: saving transaction failed.\n\n' + JSON.stringify(newTransaction.dataValues));
            throw err;
        }

        return newTransaction;
    }
}

module.exports = TransactionLogic;
