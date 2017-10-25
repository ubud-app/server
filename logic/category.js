'use strict';

const _ = require('underscore');
const BaseLogic = require('./_');
const ErrorResponse = require('../helpers/errorResponse');

class CategoryLogic extends BaseLogic {
	static getModelName () {
		return 'category';
	}

	static getPluralModelName () {
		return 'categories';
	}

	static format (category) {
		return {
			id: category.id,
			name: category.name,
			documentId: category.documentId
		};
	}

	static get (id, options) {
		const DatabaseHelper = require('../helpers/database');
		return this.getModel().findOne({
			where: {
				id: id
			},
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
		});
	}

	static list (params, options) {
		const DatabaseHelper = require('../helpers/database');

		const sql = {
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
			}],
			order: [
				['name', 'ASC']
			]
		};

		_.each(params, (id, k) => {
			if(k === 'document') {
				sql.include[0].where = {id};
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

module.exports = CategoryLogic;