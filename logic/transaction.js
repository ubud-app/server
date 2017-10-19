'use strict';

const _ = require('underscore');
const BaseLogic = require('./_');
const ErrorResponse = require('../helpers/errorResponse');

class TransactionLogic extends BaseLogic {
	static getModelName () {
		return 'transaction';
	}

	static getPluralModelName () {
		return 'transactions';
	}

	static format (transaction) {
		return transaction;
	}

	static getValidStatusValues () {
		return ['pending', 'normal', 'cleared'];
	}

	static create (body, options) {
		const DatabaseHelper = require('../helpers/database');
		const model = this.getModel().build();

		model.time = body.time;
		if (!model.time) {
			throw new ErrorResponse(400, 'Transaction requires attribute `time`…', {
				attributes: {
					time: 'Is required!'
				}
			});
		}

		model.memo = body.memo || null;
		if (model.memo && model.memo.length > 255) {
			throw new ErrorResponse(400, 'Attribute `Transaction.memo` has a maximum length of 255 chars, sorry…', {
				attributes: {
					memo: 'Is too long, only 255 characters allowed…'
				}
			});
		}

		model.amount = parseInt(body.amount, 10) || null;
		if (isNaN(model.amount)) {
			throw new ErrorResponse(400, 'Transaction requires attribute `amount`…', {
				attributes: {
					amount: 'Is required!'
				}
			});
		}

		model.status = body.status || 'normal';
		if (this.getValidStatusValues().indexOf(model.status) === -1) {
			throw new ErrorResponse(
				400,
				'Attribute `Transaction.status` is invalid, must be one of: ' + this.getValidStatusValues().join(', '), {
					attributes: {
						name: 'Invalid value'
					}
				});
		}

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

				model.accountId = accountModel.id;
				return model.save();
			})
			.then(function (model) {
				return {model};
			})
			.catch(e => {
				throw e;
			});
	}

	static get (id, options) {
		const DatabaseHelper = require('../helpers/database');
		return this.getModel().findOne({
			where: {
				id: id
			},
			include: [
				{
					model: DatabaseHelper.get('account'),
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
				},
				{
					model: DatabaseHelper.get('unit')
				}
			]
		});
	}

	static list (params, options) {
		const moment = require('moment');
		const DatabaseHelper = require('../helpers/database');

		const sql = {
			include: [
				{
					model: DatabaseHelper.get('account'),
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
}

module.exports = TransactionLogic;