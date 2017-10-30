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

	static create (body, options) {
		const DatabaseHelper = require('../helpers/database');
		const model = this.getModel().build();

		model.name = body.name;
		if (!model.name) {
			throw new ErrorResponse(400, 'Category requires attribute `name`…', {
				attributes: {
					name: 'Is required!'
				}
			});
		}
		if (model.name.length > 255) {
			throw new ErrorResponse(400, 'Attribute `Category.name` has a maximum length of 255 chars, sorry…', {
				attributes: {
					name: 'Is too long, only 255 characters allowed…'
				}
			});
		}

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
					throw new ErrorResponse(400, 'Not able to create category: linked document not found.');
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

	static update (model, body) {
		if(body.name !== undefined) {
			model.name = body.name;
		}
		if (!model.name) {
			throw new ErrorResponse(400, 'Category requires attribute `name`…', {
				attributes: {
					name: 'Is required!'
				}
			});
		}
		if (model.name.length > 255) {
			throw new ErrorResponse(400, 'Attribute `Category.name` has a maximum length of 255 chars, sorry…', {
				attributes: {
					name: 'Is too long, only 255 characters allowed…'
				}
			});
		}

		return model.save();
	}

	static delete (model) {
		const DatabaseHelper = require('../helpers/database');

		return DatabaseHelper.get('budget').count({
			where: {
				categoryId: model.id
			}
		})
			.then(count => {
				if(count > 0) {
					throw new ErrorResponse(
						501,
						'It\'s not allowed to delete categories which still have budgets.'
					);
				}

				model.destroy();
			})
			.catch(e => {
				throw e;
			})
	}
}

module.exports = CategoryLogic;