'use strict';

const _ = require('underscore');
const BaseLogic = require('./_');
const ErrorResponse = require('../helpers/errorResponse');

class BudgetLogic extends BaseLogic {
    static getModelName() {
        return 'budget';
    }

    static getPluralModelName() {
        return 'budgets';
    }

    static format(budget) {
        return {
            id: budget.id,
            name: budget.name,
            goal: budget.goal,
            hidden: budget.hidden,
            overspending: budget.overspending,
            pluginInstanceId: budget.pluginInstanceId,
            categoryId: budget.categoryId
        };
    }

    static create(body, options) {
        const DatabaseHelper = require('../helpers/database');
        const model = this.getModel().build();

        model.name = body.name;
        if (!model.name) {
            throw new ErrorResponse(400, 'Budget requires attribute `name`…', {
                attributes: {
                    name: 'Is required!'
                }
            });
        }
        if (model.name.length > 255) {
            throw new ErrorResponse(400, 'Attribute `Budget.name` has a maximum length of 255 chars, sorry…', {
                attributes: {
                    name: 'Is too long, only 255 characters allowed…'
                }
            });
        }

        model.goal = parseInt(body.goal, 10) || null;

        return DatabaseHelper.get('category')
            .find({
                where: {id: body.categoryId},
                attributes: ['id'],
                include: [{
                    model: DatabaseHelper.get('document'),
                    attributes: [],
                    include: DatabaseHelper.includeUserIfNotAdmin(options.session)
                }]
            })
            .then(function (categoryModel) {
                if (!categoryModel) {
                    throw new ErrorResponse(400, 'Not able to create budget: linked category not found.');
                }

                model.categoryId = categoryModel.id;
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
                model: DatabaseHelper.get('category'),
                attributes: [],
                include: [{
                    model: DatabaseHelper.get('document'),
                    attributes: [],
                    include: DatabaseHelper.includeUserIfNotAdmin(options.session)
                }]
            }]
        });
    }

    static list(params, options) {
        const DatabaseHelper = require('../helpers/database');

        const sql = {
            include: [{
                model: DatabaseHelper.get('category'),
                attributes: [],
                required: true,
                include: [{
                    model: DatabaseHelper.get('document'),
                    attributes: [],
                    required: true,
                    include: options.session.user.isAdmin ? [] : [{
                        model: DatabaseHelper.get('user'),
                        attributes: [],
                        required: true,
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
            if (k === 'categorie') {
                sql.include[0].where = {id};
            }
            else if (k === 'document') {
                sql.include[0].include[0].where = {id};
            }
            else if (k === 'hidden') {
                sql.where = {
                    hidden: id === '1' || id === 'true'
                };
            }
            else {
                throw new ErrorResponse(400, 'Unknown filter `' + k + '`!');
            }
        });

        return this.getModel().findAll(sql);
    }

    static async update(model, body, options) {
        const DatabaseHelper = require('../helpers/database');

        if (body.name !== undefined) {
            model.name = body.name;
        }
        if (!model.name) {
            throw new ErrorResponse(400, 'Budget requires attribute `name`…', {
                attributes: {
                    name: 'Is required!'
                }
            });
        }
        if (model.name.length > 255) {
            throw new ErrorResponse(400, 'Attribute `Budget.name` has a maximum length of 255 chars, sorry…', {
                attributes: {
                    name: 'Is too long, only 255 characters allowed…'
                }
            });
        }

        if (body.goal !== undefined && !model.pluginInstanceId) {
            model.goal = parseInt(body.goal, 10) || null;
        }
        else if (body.goal !== undefined) {
            throw new ErrorResponse(400, 'Attribute `Budget.goal` is managed by a plugin, you are not allowed to update it…', {
                attributes: {
                    name: 'Managed by a plugin, not allowed to be changed…'
                }
            });
        }
        if (body.hidden !== undefined) {
            model.hidden = !!body.hidden;
        }

        if (!body.categoryId) {
            return model.save();
        }

        return DatabaseHelper.get('category')
            .find({
                where: {id: body.categoryId},
                attributes: ['id'],
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
            })
            .then(function (categoryModel) {
                if (!categoryModel) {
                    throw new ErrorResponse(400, 'Not able to update budget: linked category not found.');
                }

                model.categoryId = categoryModel.id;
                return model.save();
            })
            .then(function (model) {
                return {model};
            })
            .catch(e => {
                throw e;
            });
    }

    static delete() {
        throw new ErrorResponse(
            501,
            'It\'s not allowed to delete budgets, try to hide them or remove the whole document.'
        );
    }
}

module.exports = BudgetLogic;