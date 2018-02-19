'use strict';

const BaseLogic = require('./_');
const ErrorResponse = require('../helpers/errorResponse');

class PortionLogic extends BaseLogic {
    static getModelName() {
        return 'portion';
    }

    static getPluralModelName() {
        return 'portions';
    }

    static format(portion) {
        return {
            id: portion.id,
            budgetId: portion.budgetId,
            month: portion.month,
            budgeted: portion.budgeted,
            outflow: portion.outflow,
            balance: portion.balance
        };
    }

    static get(id, options) {
        const DatabaseHelper = require('../helpers/database');
        return this.getModel().findOne({
            where: {
                id: id
            },
            include: [{
                model: DatabaseHelper.get('budget'),
                attributes: ['id'],
                include: [{
                    model: DatabaseHelper.get('category'),
                    attributes: ['documentId'],
                    include: [{
                        model: DatabaseHelper.get('document'),
                        attributes: [],
                        include: DatabaseHelper.includeUserIfNotAdmin(options.session)
                    }]
                }]
            }]
        });
    }

    static list(params, options) {
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
        return DatabaseHelper.get('budget').findAll({
            attributes: ['id'],
            include: [{
                model: DatabaseHelper.get('category'),
                attributes: ['id'],
                include: [{
                    model: DatabaseHelper.get('document'),
                    attributes: [],
                    where: {
                        id: params.document
                    },
                    include: DatabaseHelper.includeUserIfNotAdmin(options.session)
                }]
            }]
        })
            .then(budgets => {
                if (!budgets.length) {
                    return Promise.resolve([]);
                }

                /*
                 *   2. Get Portions for the given Budgets
                 *
                 *   Promise returns something like:
                 *   [
                 *   	{
                 *   		budgetId
                 *   		portion (optional)
                 *	 	}
                 *   ]
                 *
                 *   @todo merge this and the select above
                 */
                return PortionLogic.getModel().findAll({
                    where: {
                        month,
                        budgetId: {
                            [DatabaseHelper.op('in')]: budgets.map(b => b.id)
                        }
                    }
                })
                    .then(portions => {
                        return budgets.map(b => ({
                            budgetId: b.id,
                            portion: portions.find(p => p.budgetId === b.id) || null
                        }));
                    })
                    .catch(e => {
                        throw e;
                    });
            })
            .then(budgets => {
                /*
                 *   3. Find missing portions, calculate their values and create them
                 *      Promise returns a portions array
                 */
                return Promise.all(budgets.map(budget => {
                    if (budget.portion) {
                        return Promise.resolve(budget.portion);
                    }

                    budget.portion = PortionLogic.getModel().build({
                        month,
                        budgetId: budget.budgetId,
                        budgeted: null
                    });

                    return PortionLogic.recalculatePortion(budget.portion);
                }));
            })
            .catch(e => {
                throw e;
            });
    }

    static async update(model, body) {
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

    static recalculatePortionsFrom(options) {
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
                attributes: [],
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

    static recalculatePortion(portion) {
        const moment = require('moment');
        const DatabaseHelper = require('../helpers/database');
        const monthMoment = moment(portion.month);

        return Promise.all([
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
            }),
        ])
            .then(calculated => {
                portion.outflow = parseInt(calculated[0].outflow) || 0;
                portion.balance = (parseInt(calculated[2].budgetedTillLastMonth) || 0) +
                    (parseInt(calculated[1].transactions) || 0) +
                    (portion.budgeted || 0);

                portion.outflow *= -1;
                return portion.save();
            })
            .catch(e => {
                throw e;
            });
    }
}

module.exports = PortionLogic;