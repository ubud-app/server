'use strict';

const BaseLogic = require('./_');
const DatabaseHelper = require('../helpers/database');
const ErrorResponse = require('../helpers/errorResponse');

class DocumentLogic extends BaseLogic {
	static getModelName () {
		return 'document';
	}

	static getPluralModelName () {
		return 'documents';
	}

	static format (document, secrets, options) {
		const r = {
			id: document.id,
			name: document.name,
			settings: {}
		};

		document.settings.forEach(function(setting) {
			r.settings[ setting.key ] = setting.value;
		});

		if (options.session.user.isAdmin && document.users) {
			r.users = document.users.map(user => ({
				id: user.id,
				email: user.email
			}));
		}

		return r;
	}

	static create (attributes, options) {
		const model = this.getModel().build();
		let document;

		model.name = attributes.name;
		if (!model.name) {
			throw new ErrorResponse(400, 'Documents require an attribute `name`…', {
				attributes: {
					name: 'Is required!'
				}
			});
		}

		return model.save()
			.then(function(_document) {
				document = _document;
				return document.addUser(options.session.user);
			})
			.then(function () {
				return {model: document};
			})
			.catch(err => {
				throw err;
			});
	}

	static get (id, options) {
		const sql = {
			where: {id},
		};

		if(!options.session.user.isAdmin) {
			sql.include = [{
				model: DatabaseHelper.get('user'),
				attributes: [],
				where: {
					id: options.session.userId
				}
			}];
		}

		return this.getModel().findOne(sql);
	}

	static list (params, options) {
		const sql = {
			include: [
				{
					model: DatabaseHelper.get('setting')
				}
			]
		};

		if(!options.session.user.isAdmin) {
			sql.include.push({
				model: DatabaseHelper.get('user'),
				attributes: [],
				where: {
					id: options.session.userId
				}
			});
		}

		return this.getModel().findAll(sql);
	}

	static update (model, body) {
		if (body.name !== undefined && !body.name) {
			throw new ErrorResponse(400, 'Document name can\'t be empty…', {
				attributes: {
					name: 'Is required'
				}
			});
		}
		if(body.name) {
			model.name = body.name;
		}

		return model.save();
	}

	static delete (model) {
		return model.destroy();
	}
}

module.exports = DocumentLogic;