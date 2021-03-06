'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const {pwnedPassword} = require('hibp');
const mailValidator = require('email-validator');
const moment = require('moment');

const BaseLogic = require('./_');
const ErrorResponse = require('../helpers/errorResponse');
const RepositoryHelper = require('../helpers/repository');
const KeychainHelper = require('../helpers/keychain');

class UserLogic extends BaseLogic {
    static getModelName () {
        return 'user';
    }

    static getPluralModelName () {
        return 'users';
    }

    static async format (user, secrets) {
        const terms = await RepositoryHelper.getTerms();
        const canUnlockKeychain = !!user.keychainKey ||
            !user.keychainKey && user.isAdmin && !await KeychainHelper.isSetUp()
        ;

        const r = {
            id: user.id,
            email: user.email,
            admin: {
                isAdmin: user.isAdmin,
                canUnlockKeychain,
                shouldUnlockKeychain: canUnlockKeychain && KeychainHelper.isLocked()
            },
            otpEnabled: user.otpEnabled,
            needsPasswordChange: user.needsPasswordChange,
            terms: {
                accepted: moment().isAfter(terms.validFrom) ? terms.version : user.acceptedTermVersion,
                current: terms
            }
        };

        if (secrets.password) {
            r.password = secrets.password;
        }

        return r;
    }

    static async create (attributes, options) {
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

        const random = await new Promise((resolve, reject) => {
            crypto.randomBytes(16, (err, buffer) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(buffer.toString('hex'));
                }
            });
        });

        secrets.password = random;
        const hash = await bcrypt.hash(random, 10);
        model.password = hash;

        await KeychainHelper.unlock(model, secrets.password, {dontSave: true});

        try {
            await model.save();
        }
        catch (err) {
            if (err.toString().indexOf('SequelizeUniqueConstraintError') > -1) {
                throw new ErrorResponse(400, 'User with this email address already exists…', {
                    attributes: {
                        email: 'Already exists'
                    }
                });
            }

            throw err;
        }

        return {model, secrets};
    }

    static async get (id, options) {
        if (options.session.user.isAdmin || id === options.session.userId) {
            return this.getModel().findByPk(id);
        }

        return null;
    }

    static async list (params, options) {
        const req = {};

        if (!options.session.user.isAdmin) {
            req.where = {
                id: options.session.userId
            };
        }

        return this.getModel().findAll(req);
    }

    static async update (model, body, options) {

        // email
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


        // password
        if (model.id !== options.session.userId && body.password !== undefined) {
            throw new ErrorResponse(403, 'You are not allowed to update other people\'s password!');
        }
        if (body.password !== undefined) {
            const [hash, count] = await Promise.all([
                bcrypt.hash(body.password, 10),
                pwnedPassword(body.password)
            ]);

            if (count > 0) {
                throw new ErrorResponse(400, 'Password is not secure…', {
                    attributes: {
                        password: `Seems not to be secure. Password is listed on haveibeenpwned.com ${count} times.`
                    }
                });
            }
            if (model.isAdmin && KeychainHelper.isLocked()) {
                throw new ErrorResponse(400, 'Keychain is locked…', {
                    attributes: {
                        password: 'Please unlock keychain before changing password.'
                    }
                });
            }

            model.password = hash;
            model.needsPasswordChange = false;
            model.keychainKey = null;

            await KeychainHelper.unlock(model, body.password, {dontSave: true});
        }


        // isAdmin
        if (options.session.user.isAdmin && body.isAdmin !== undefined && body.admin && body.admin.isAdmin !== model.isAdmin) {
            model.isAdmin = !!body.admin.isAdmin;

            if (!model.isAdmin) {
                model.keychainKey = null;
            }
        }
        else if (body.isAdmin !== undefined && !!body.isAdmin !== model.isAdmin) {
            throw new ErrorResponse(403, 'You are not allowed to update other people\'s admin privilege!');
        }


        // unlock keychain
        if (body.admin.unlockPassword) {
            const passwordCorrect = await bcrypt.compare(body.admin.unlockPassword, model.password);
            if (!passwordCorrect) {
                throw new ErrorResponse(400, 'Not able to unlock keychain: Is your password correct?');
            }

            await KeychainHelper.unlock(model, body.admin.unlockPassword, {dontSave: true});
        }


        // terms
        if (body.terms.accepted && body.terms.accepted !== model.acceptedTermVersion) {
            model.acceptedTermVersion = body.terms.accepted;
        }

        await model.save();
        return {model};
    }

    static async delete (model, options) {
        if (model.id === options.session.userId) {
            throw new ErrorResponse(400, 'Sorry, but you can\'t delete yourself…');
        }

        return model.destroy();
    }
}

module.exports = UserLogic;
