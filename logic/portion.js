'use strict';

const _ = require('underscore');
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
			budgetId: portion.budgetId,
			month: portion.month,
			budgeted: portion.budgeted,
			outflow: portion.outflow,
			balance: portion.balance
		};
	}

	static get (id, options) {
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
						include: [{
							model: DatabaseHelper.get('user'),
							attributes: [],
							where: {
								id: options.session.userId
							}
						}]
					}]
				}]
			}]
		});
	}

	static list (params, options) {
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

						include: [{
							model: DatabaseHelper.get('user'),
							attributes: [],
							where: {
								id: options.session.userId
							}
						}]
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

	static recalculatePortion (portion) {
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
								[DatabaseHelper.op('gte')]: moment(monthMoment).startOf('month'),
								[DatabaseHelper.op('lte')]: moment(monthMoment).endOf('month')
							}
						}
					}]
				}),

				/*
				 *   2. Calculate Portion's Balance
				 */
				DatabaseHelper.get('unit').findOne({
					attributes: [
						[DatabaseHelper.sum('unit.amount'), 'balance']
					],
					where: {
						budgetId: portion.budgetId
					},
					include: [{
						model: DatabaseHelper.get('transaction'),
						attributes: [],
						where: {
							time: {
								[DatabaseHelper.op('lte')]: moment(monthMoment).endOf('month')
							}
						}
					}]
				})
			])
			.then(calculated => {
				portion.outflow = parseInt(calculated[0].dataValues.outflow) || 0;
				portion.balance = parseInt(calculated[1].dataValues.balance) || 0;

				portion.outflow *= -1;
				return portion.save();
			})
			.catch(e => {
				throw e;
			});
	}
}

module.exports = PortionLogic;