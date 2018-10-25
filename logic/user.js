'use strict';

const crypto = require('crypto');
const bcrypt = require('bcrypt');
const mailValidator = require('email-validator');

const BaseLogic = require('./_');
const ErrorResponse = require('../helpers/errorResponse');

class UserLogic extends BaseLogic {
    static getModelName() {
        return 'user';
    }

    static getPluralModelName() {
        return 'users';
    }

    static format(user, secrets) {
        const r = {
            id: user.id,
            email: user.email,
            isAdmin: user.isAdmin,
            otpEnabled: user.otpEnabled,
            needsPasswordChange: user.needsPasswordChange
        };

        if (secrets.password) {
            r.password = secrets.password;
        }

        return r;
    }

    static create(attributes, options) {
        if (!options.session.user.isAdmin) {
            throw new ErrorResponse(403, 'You need admin privileges to create new users…');
        }

        const secrets = {};
        const model = this.getModel().build();

        model.isAdmin = !!attributes.isAdmin;
        model.needsPasswordChange = true;

        model.email = attributes.email;
        if (!model.email) {
            throw new ErrorResponse(400, 'User requires attribute `email`…', {
                attributes: {
                    key: 'Is required!'
                }
            });
        }
        if (!mailValidator.validate(model.email)) {
            throw new ErrorResponse(400, 'Email doesn\'t seem to be valid…', {
                attributes: {
                    key: 'Is not valid!'
                }
            });
        }

        return new Promise((resolve, reject) => {
            crypto.randomBytes(16, (err, buffer) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(buffer.toString('hex'));
                }
            });
        })
            .then(function (random) {
                secrets.password = random;
                return bcrypt.hash(random, 10);
            })
            .then(function (hash) {
                model.password = hash;
                return model.save();
            })
            .then(function (model) {
                return {model, secrets};
            })
            .catch(function (err) {
                if (err.toString().indexOf('SequelizeUniqueConstraintError') > -1) {
                    throw new ErrorResponse(400, 'User with this email address already exists…', {
                        attributes: {
                            email: 'Already exists'
                        }
                    });
                }

                throw err;
            })
            .catch(e => {
                throw e;
            });
    }

    static get(id, options) {
        if (options.session.user.isAdmin || id === options.session.userId) {
            return this.getModel().findByPk(id);
        }

        return Promise.resolve(null);
    }

    static list(params, options) {
        const req = {};

        if (!options.session.user.isAdmin) {
            req.where = {
                id: options.session.userId
            };
        }

        return this.getModel().findAll(req);
    }

    static update(model, body, options) {
        return new Promise(function (cb) {
            if (body.email === undefined) {
                throw false;
            }
            if (!options.session.user.isAdmin && model.id !== options.session.userId) {
                throw new ErrorResponse(403, 'You are not allowed to update other people\'s email address!');
            }

            model.email = body.email;

            if (!mailValidator.validate(model.email)) {
                throw new ErrorResponse(400, 'Email doesn\'t seem to be valid…', {
                    attributes: {
                        email: 'Is not valid!'
                    }
                });
            }

            cb();
        })
            .then(function () {
                if (model.id !== options.session.userId && body.password !== undefined) {
                    throw new ErrorResponse(403, 'You are not allowed to update other people\'s password!');
                }

                if (body.password === undefined) {
                    return Promise.resolve();
                }

                return bcrypt
                    .hash(body.password, 10)
                    .then(function (hash) {
                        model.password = hash;
                        model.needsPasswordChange = false;

                        return Promise.resolve();
                    });
            })
            .then(function () {
                if (options.session.user.isAdmin && body.isAdmin !== undefined && !!body.isAdmin !== model.isAdmin) {
                    model.isAdmin = !!body.isAdmin;
                }
                else if (body.isAdmin !== undefined && !!body.isAdmin !== model.isAdmin) {
                    throw new ErrorResponse(403, 'You are not allowed to update other people\'s admin privilege!');
                }

                return model.save();
            })
            .then(model => {
                return {model};
            })
            .catch(err => {
                throw err;
            });
    }

    static delete(model, options) {
        if (model.id === options.session.userId) {
            throw new ErrorResponse(400, 'Sorry, but you can\'t delete yourself…');
        }

        return model.destroy();
    }
}

module.exports = UserLogic;