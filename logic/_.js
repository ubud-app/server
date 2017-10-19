'use strict';

const ErrorResponse = require('../helpers/errorResponse');

class BaseLogic {
	static getModelName () {
		throw new ErrorResponse(500, 'getModelName() is not overwritten!');
	}

	static getPluralModelName () {
		throw new ErrorResponse(500, 'getModelName() is not overwritten!');
	}

	static getModel () {
		const DatabaseHelper = require('../helpers/database');
		return DatabaseHelper.get(this.getModelName());
	}

	static getAvailableRoutes () {
		return ['create', 'get', 'list', 'update', 'delete'];
	}

	static getPathForRoute (route) {
		let regex = '/api/' + this.getPluralModelName();
		if (['get', 'update', 'delete'].indexOf(route) > -1) {
			regex += '/([a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12})$';
		}
		else if (route === 'list') {
			regex += '/?([a-zA-Z]*)$';
		}

		return new RegExp(regex, '');
	}

	static serveCreate (options) {
		const l = this;
		if (!l.create) {
			throw new ErrorResponse(501, 'Not implemented yet!');
		}

		return l.create(options.body, options)
			.then(({model, secrets}) => {
				return l.format(model, secrets || {}, options);
			})
			.catch(function (err) {
				throw err;
			});
	}

	static serveGet (options) {
		const l = this;
		if (!l.get) {
			throw new ErrorResponse(501, 'Not implemented yet!');
		}

		return l.get(options.id, options)
			.then(function (model) {
				if (!model) {
					throw new ErrorResponse(404, 'Not Found');
				}
				return l.format(model, {}, options);
			})
			.catch(function (err) {
				throw err;
			});
	}

	static serveList (options) {
		const l = this;
		const id = options.id || 'default';
		if (!l.list) {
			throw new ErrorResponse(501, 'Not implemented yet!');
		}

		const params = {};
		id.split('/').forEach(part => {
			const p = part.split(':', 2);
			params[ p[0] ] = p[1] !== undefined ? p[1] : true;
		});

		return l.list(params, options)
			.then(function (models) {
				return models.map(model => l.format(model, {}, options));
			})
			.catch(function (err) {
				throw err;
			});
	}

	static serveUpdate (options) {
		const l = this;

		return new Promise(function (cb) {
			if (!l.update || !l.get) {
				throw new ErrorResponse(501, 'Not implemented yet!');
			}
			if (!options.id) {
				throw new ErrorResponse(400, 'You need an ID to make an update!');
			}

			cb();
		})
			.then(function () {
				return l.get(options.id, options);
			})
			.then(function (model) {
				if (!model) {
					throw new ErrorResponse(404, 'Not Found');
				}

				return l.update(model, options.body, options);
			})
			.then(function (model) {
				return l.format(model, {}, options);
			})
			.catch(function (err) {
				throw err;
			});
	}

	static serveDelete (options) {
		const l = this;

		if (!options.id) {
			throw new ErrorResponse(400, 'You need an ID to make an update!');
		}
		if (!l.delete) {
			throw new ErrorResponse(501, 'Not implemented yet!');
		}

		return l.get(options.id, options)
			.then(function (model) {
				if (!model) {
					throw new ErrorResponse(404, 'Not Found');
				}
				return model;
			})
			.then(model => {
				l.delete(model, options);
			})
			.catch(e => {
				throw e;
			});
	}
}


module.exports = BaseLogic;