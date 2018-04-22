'use strict';

const _ = require('underscore');
const BaseLogic = require('./_');
const ErrorResponse = require('../helpers/errorResponse');

class PayeeLogic extends BaseLogic {
    static getModelName() {
        return 'payee';
    }

    static getPluralModelName() {
        return 'payees';
    }

    static format(payee) {
        return {
            id: payee.id,
            name: payee.name,
            documentId: payee.documentId
        };
    }

    static create(body, options) {
        const DatabaseHelper = require('../helpers/database');
        const model = this.getModel().build();

        model.name = body.name;
        if (!model.name) {
            throw new ErrorResponse(400, 'Account requires attribute `name`…', {
                attributes: {
                    name: 'Is required!'
                }
            });
        }
        if (model.name.length > 255) {
            throw new ErrorResponse(400, 'Attribute `Account.name` has a maximum length of 255 chars, sorry…', {
                attributes: {
                    name: 'Is too long, only 255 characters allowed…'
                }
            });
        }

        return DatabaseHelper.get('document')
            .find({
                where: {id: body.documentId},
                attributes: ['id'],
                include: DatabaseHelper.includeUserIfNotAdmin(options.session)
            })
            .then(function (documentModel) {
                if (!documentModel) {
                    throw new ErrorResponse(401, 'Not able to create account: linked document not found.');
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

    static get(id, options) {
        const DatabaseHelper = require('../helpers/database');
        return this.getModel().findOne({
            where: {
                id: id
            },
            include: [{
                model: DatabaseHelper.get('document'),
                attributes: [],
                include: DatabaseHelper.includeUserIfNotAdmin(options.session)
            }]
        });
    }

    static list(params, options) {
        const DatabaseHelper = require('../helpers/database');
        const moment = require('moment');

        const sql = {
            include: [{
                model: DatabaseHelper.get('document'),
                attributes: ['id'],
                required: true,
                include: options.session.user.isAdmin ? [] : [{
                    model: DatabaseHelper.get('user'),
                    attributes: [],
                    required: true,
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
            if (k === 'document') {
                sql.include[0].where = {id};
            }
            else if (k === 'q') {
                sql.where = {
                    name: {[DatabaseHelper.op('like')]: '%' + id + '%'}
                };
            }
            else if (k === 'limit') {
                sql.limit = parseInt(id, 10) || null;
            }
            else if (k === 'updatedSince') {
                sql.where = sql.where || {};

                const m = moment(id);
                if(!m.isValid()) {
                    throw new ErrorResponse(400, 'Attribute `updated-since` has to be a valid datetime, sorry…', {
                        attributes: {
                            updatedSince: 'Is not valid'
                        }
                    });
                }
                sql.where.updatedAt = {
                    [DatabaseHelper.op('gte')]: m.toJSON()
                };
            }
            else {
                throw new ErrorResponse(400, 'Unknown filter `' + k + '`!');
            }
        });

        return this.getModel().findAll(sql);
    }
}

module.exports = PayeeLogic;