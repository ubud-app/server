'use strict';

const _ = require('underscore');
const BaseLogic = require('./_');
const ErrorResponse = require('../helpers/errorResponse');

class BudgetLogic extends BaseLogic {
	static getModelName () {
		return 'budget';
	}

	static getPluralModelName () {
		return 'budgets';
	}

	static format (budget) {
		return {
			id: budget.id,
			name: budget.name,
			goal: budget.goal,
			hidden: budget.hidden,
			overspending: budget.overspending,
			pluginId: budget.pluginId,
			categoryId: budget.categoryId
		};
	}

	static get (id, options) {
		const DatabaseHelper = require('../helpers/database');
		return this.getModel().findOne({
			where: {
				id: id
			},
			include: [{
				model: DatabaseHelper.get('category'),
				attributes: [],
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
		});
	}

	static list (params, options) {
		const DatabaseHelper = require('../helpers/database');

		const sql = {
			include: [{
				model: DatabaseHelper.get('category'),
				attributes: [],
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
			}],
			order: [
				['name', 'ASC']
			]
		};

		_.each(params, (id, k) => {
			if(k === 'categorie') {
				sql.include[0].where = {id};
			}
			else if(k === 'document') {
				sql.include[0].include[0].where = {id};
			}
			else {
				throw new ErrorResponse(400, 'Unknown filter `' + k + '`!')
			}
		});

		return this.getModel().findAll(sql);
	}

	static delete () {
		throw new ErrorResponse(
			501,
			'It\'s not allowed to delete accounts, try to hide them or remove the whole document.'
		);
	}
}

module.exports = BudgetLogic;