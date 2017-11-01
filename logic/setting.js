'use strict';

const BaseLogic = require('./_');
const LogHelper = require('../helpers/log');
const DatabaseHelper = require('../helpers/database');
const ErrorResponse = require('../helpers/errorResponse');
const log = new LogHelper('SettingLogic');

class SettingLogic extends BaseLogic {
	static getModelName () {
		return 'setting';
	}

	static getPluralModelName () {
		return 'settings';
	}

	static format (setting) {
		let value = null;

		if (setting.value !== undefined && setting.value !== null) {
			try {
				value = JSON.parse(setting.value);
			}
			catch (err) {
				log.warn(new Error('Unable to parse setting value `' + setting.value + '`:'));
			}
		}

		return {
			id: setting.id,
			documentId: setting.documentId,
			key: setting.key,
			value: value
		};
	}

	static create (attributes, options) {
		const model = this.getModel().build();

		model.key = attributes.key;
		if (!model.key) {
			throw new ErrorResponse(400, 'Setting requires attribute `key`…', {
				attributes: {
					key: 'Is required!'
				}
			});
		}

		model.value = JSON.stringify(attributes.value);

		model.documentId = attributes.documentId;
		if (!model.documentId) {
			throw new ErrorResponse(400, 'Setting requires attribute `documentId`…', {
				attributes: {
					documentId: 'Is required!'
				}
			});
		}

		return DatabaseHelper
			.get('document')
			.find({
				attributes: ['id'],
				where: {
					id: model.documentId
				},
				include: [{
					model: DatabaseHelper.get('user'),
					attributes: [],
					where: {
						id: options.session.userId
					},
					through: {
						attributes: []
					}
				}]
			})
			.then(function (document) {
				if (!document) {
					throw new ErrorResponse(400, 'Document given in `documentId` not found…', {
						attributes: {
							documentId: 'Document not found'
						}
					});
				}

				model.documentId = document.id;
				return model.save();
			})
			.catch(function (err) {
				if (err.toString().indexOf('SequelizeUniqueConstraintError') > -1) {
					throw new ErrorResponse(400, 'Setting with this key already exists in document…', {
						attributes: {
							key: 'Already exists'
						}
					});
				}

				throw err;
			})
			.then(function (model) {
				return {model};
			})
			.catch(err => {
				throw err;
			});
	}

	static get (id, options) {
		return this.getModel().findOne({
			where: {id},
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
		return this.getModel().findAll({
			include: [{
				model: DatabaseHelper.get('document'),
				required: true,
				include: [{
					model: DatabaseHelper.get('user'),
					attributes: [],
					required: true,
					where: {
						id: options.session.userId
					}
				}]
			}]
		});
	}

	static update (model, body) {
		if (body.key !== undefined && body.key !== model.key) {
			throw new ErrorResponse(400, 'It\'s not allowed to change the Setting key…', {
				attributes: {
					key: 'Changes not allowed'
				}
			});
		}
		if (body.documentId !== undefined && body.documentId !== model.documentId) {
			throw new ErrorResponse(400, 'It\'s not allowed to change the Setting document id…', {
				attributes: {
					key: 'Changes not allowed'
				}
			});
		}

		model.value = JSON.stringify(body.value);
		return model.save();
	}
}

module.exports = SettingLogic;