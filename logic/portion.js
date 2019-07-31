'use strict';

const BaseLogic = require('./_');
const ErrorResponse = require('../helpers/errorResponse');

class PortionLogic extends BaseLogic {
    static getModelName () {
        return 'portion';
    }

    static getPluralModelName () {
        return 'portions';
    }

    static format (portion) {
        return {
            id: portion.id,
            month: portion.month,
            budgeted: portion.budgeted,
            outflow: portion.outflow,
            balance: portion.balance,
            budgetId: portion.budget.id,
            hidden: portion.budget.hidden,
            documentId: portion.budget.category.documentId
        };
    }

    static async get (id, options) {
        const DatabaseHelper = require('../helpers/database');
        return this.getModel().findOne({
            where: {
                id: id
            },
            include: [{
                model: DatabaseHelper.get('budget'),
                attributes: ['id', 'hidden'],
                include: [{
                    model: DatabaseHelper.get('category'),
                    attributes: ['id', 'documentId'],
                    include: [{
                        model: DatabaseHelper.get('document'),
                        attributes: [],
                        include: DatabaseHelper.includeUserIfNotAdmin(options.session)
                    }]
                }]
            }]
        });
    }

    static async list (params, options) {
        const moment = require('moment');
        const DatabaseHelper = require('../helpers/database');

        if (!params.document) {
            throw new ErrorResponse(400, 'Can not list portions without document…', {
                attributes: {
                    document: 'Is required!'
                }
            });
        }

        const monthMoment = moment(params.month, 'YYYY-MM');
        const month = monthMoment.format('YYYY-MM');
        if (!monthMoment.isValid()) {
            throw new ErrorResponse(400, 'Can not list portions without month…', {
                attributes: {
                    month: 'Is required!'
                }
            });
        }

        /*
         *   1. Fetch Budgets
         */
        const budgets = await DatabaseHelper.get('budget').findAll({
            attributes: ['id', 'name'],
            include: [{
                model: DatabaseHelper.get('category'),
                attributes: ['id'],
                required: true,
                include: [{
                    model: DatabaseHelper.get('document'),
                    attributes: ['id'],
                    required: true,
                    where: {
                        id: params.document
                    },
                    include: DatabaseHelper.includeUserIfNotAdmin(options.session)
                }]
            }]
        });

        if (!budgets.length) {
            return [];
        }

        /*
         *   2. Get Portions for the given Budgets
         *
         *   budgets holds something like:
         *   [
         *   	{
         *   		budgetId
         *   		portion (optional)
         *	 	}
         *   ]
         *
         *   @todo merge this and the select above
         */
        const portions = await PortionLogic.getModel().findAll({
            where: {
                month,
                budgetId: {
                    [DatabaseHelper.op('in')]: budgets.map(b => b.id)
                }
            },
            include: [{
                model: DatabaseHelper.get('budget'),
                attributes: ['id', 'hidden'],
                required: true,
                include: [{
                    model: DatabaseHelper.get('category'),
                    attributes: ['id', 'documentId'],
                    required: true
                }]
            }]
        });

        const myBudgets = budgets.map(b => ({
            budget: b,
            portion: portions.find(p => p.budgetId === b.id) || null
        }));

        /*
         *   3. Find missing portions, calculate their values and create them
         *      Promise returns a portions array
         */
        return Promise.all(myBudgets.map(budget => (async () => {
            if (budget.portion) {
                return budget.portion;
            }

            budget.portion = PortionLogic.getModel().build({
                month,
                budgetId: budget.budget.id,
                budget: budget.budget,
                budgeted: null
            });

            await PortionLogic.recalculatePortion(budget.portion);

            budget.portion.budget = budget.budget;
            return budget.portion;
        })()));
    }

    static async update (model, body) {
        const moment = require('moment');
        const SummaryLogic = require('../logic/summary');

        if (body.budgeted !== undefined && body.budgeted !== model.budgeted) {
            model.budgeted = parseInt(body.budgeted) || null;

            await PortionLogic.recalculatePortion(model);

            // update portions
            PortionLogic.recalculatePortionsFrom({
                month: moment(model.month, 'YYYY-MM').add(1, 'month').startOf('month'),
                budgetId: model.budgetId
            });

            // update summaries
            SummaryLogic.recalculateSummariesFrom(
                model.budget.category.documentId,
                moment(model.month, 'YYYY-MM').startOf('month')
            );
        }

        return {model};
    }

    static recalculatePortionsFrom (options) {
        const moment = require('moment');
        const DatabaseHelper = require('../helpers/database');
        const monthMoment = moment(options.month);
        if (!monthMoment.isValid()) {
            throw new Error('Invalid Month: ' + options.month);
        }

        const query = {
            where: {
                month: {
                    [DatabaseHelper.op('gte')]: moment(monthMoment).format('YYYY-MM')
                }
            }
        };

        if (options.budgetId) {
            query.where.budgetId = options.budgetId;
        }
        else if (options.documentId) {
            query.include = [{
                model: DatabaseHelper.get('budget'),
                attributes: ['id', 'hidden'],
                include: [{
                    model: DatabaseHelper.get('category'),
                    attributes: [],
                    where: {
                        documentId: options.documentId
                    }
                }]
            }];
        }
        else {
            throw new Error('Either budgetId or documentId required!');
        }

        return PortionLogic.getModel().findAll(query)
            .then(portions => {
                return Promise.all(portions.map(PortionLogic.recalculatePortion));
            })
            .catch(e => {
                throw e;
            });
    }

    static async recalculatePortion (portion) {
        const moment = require('moment');
        const DatabaseHelper = require('../helpers/database');
        const monthMoment = moment(portion.month);

        const calculated = await Promise.all([
            /*
             *   1. Calculate Portion's Outflow
             */
            DatabaseHelper.get('unit').findOne({
                attributes: [
                    [DatabaseHelper.sum('unit.amount'), 'outflow']
                ],
                where: {
                    budgetId: portion.budgetId
                },
                include: [{
                    model: DatabaseHelper.get('transaction'),
                    attributes: [],
                    where: {
                        time: {
                            [DatabaseHelper.op('gte')]: moment(monthMoment).startOf('month').toJSON(),
                            [DatabaseHelper.op('lte')]: moment(monthMoment).endOf('month').toJSON()
                        }
                    }
                }],
                raw: true
            }),

            /*
             *   2. Calculate Portion's Transactions
             */
            DatabaseHelper.get('unit').findOne({
                attributes: [
                    [DatabaseHelper.sum('unit.amount'), 'transactions']
                ],
                where: {
                    budgetId: portion.budgetId
                },
                include: [{
                    model: DatabaseHelper.get('transaction'),
                    attributes: [],
                    where: {
                        time: {
                            [DatabaseHelper.op('lte')]: moment(monthMoment).endOf('month').toJSON()
                        }
                    }
                }],
                raw: true
            }),

            /*
             *   3: Calculate Portions Budgeted
             */
            DatabaseHelper.get('portion').findOne({
                attributes: [
                    [DatabaseHelper.sum('budgeted'), 'budgetedTillLastMonth']
                ],
                where: {
                    month: {
                        [DatabaseHelper.op('lte')]: moment(monthMoment).subtract(1, 'month').endOf('month').toJSON()
                    },
                    budgetId: portion.budgetId
                },
                raw: true
            })
        ]);

        portion.outflow = (parseInt(calculated[0].outflow, 10) || 0) * -1;
        portion.balance = (parseInt(calculated[2].budgetedTillLastMonth, 10) || 0) +
            (parseInt(calculated[1].transactions, 10) || 0) +
            (portion.budgeted || 0);

        await portion.save();
    }
}

module.exports = PortionLogic;