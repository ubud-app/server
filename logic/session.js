'use strict';

const BaseLogic = require('./_');

class SessionLogic extends BaseLogic {
    static getModelName () {
        return 'session';
    }

    static getPluralModelName () {
        return 'sessions';
    }

    static format (session, secrets) {
        const j = {
            id: session.id,
            userId: session.userId,
            name: session.name,
            url: session.url,
            accepted: !session.mobilePairing
        };

        if (secrets && secrets.token) {
            j.secret = secrets.token;
        }

        return j;
    }

    static async create (attributes, options) {
        const ErrorResponse = require('../helpers/errorResponse');
        const DatabaseHelper = require('../helpers/database');
        const bcrypt = require('bcryptjs');
        const {URL} = require('url');

        const model = this.getModel().build();
        const secrets = {};

        model.name = (attributes.name || '').toString();
        if (!model.name) {
            throw new ErrorResponse(400, 'Session requires attribute `name`…', {
                attributes: {
                    name: 'Is required!'
                }
            });
        }
        if (model.name.length > 255) {
            throw new ErrorResponse(400, 'Attribute `Session.name` has a maximum length of 255 chars, sorry…', {
                attributes: {
                    name: 'Is too long, only 255 characters allowed…'
                }
            });
        }

        model.url = attributes.url || null;
        if (model.url) {
            try {
                new URL(model.url);
            }
            catch (err) {
                throw new ErrorResponse(400, 'Attribute `Session.url` seems to be invalid…', {
                    attributes: {
                        url: 'Seems to be invalid'
                    }
                });
            }
        }


        // logged in user: create mobile pairing sessions for me
        if (options.session.user) {
            model.userId = options.session.user.id;
            model.user = options.session.user;
            model.mobilePairing = true;

            const crypto = require('crypto');
            const random = await new Promise((resolve, reject) => {
                crypto.randomBytes(32, (err, buffer) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(buffer.toString('hex'));
                    }
                });
            });

            secrets.token = random;

            const hash = await bcrypt.hash(random, 10);
            model.secret = hash;

            await model.save();
            return {model, secrets};
        }


        // logged out user: login
        const userModel = await DatabaseHelper.get('user').findOne({
            where: {
                email: options.session.name
            }
        });
        if (!userModel) {
            throw new ErrorResponse(401, 'Not able to authorize: Is username / password correct?');
        }

        model.userId = userModel.id;
        model.user = userModel;

        const passwordCorrect = await bcrypt.compare(options.session.pass, userModel.password);
        if (!passwordCorrect) {
            throw new ErrorResponse(401, 'Not able to authorize: Is username / password correct?');
        }

        const RepositoryHelper = require('../helpers/repository');
        const terms = await RepositoryHelper.getTerms();
        if(attributes.acceptedTerms && userModel.acceptedTermVersion !== attributes.acceptedTerms) {
            userModel.acceptedTermVersion = attributes.acceptedTerms;
            await userModel.save();
        }
        if(!userModel.acceptedTermVersion || userModel.acceptedTermVersion !== terms.version) {
            throw new ErrorResponse(401, 'Not able to login: User has not accept the current terms!', {
                attributes: {
                    acceptedTerms: 'Is required to be set to the current term version.'
                },
                extra: terms
            });
        }

        const crypto = require('crypto');
        const random = await new Promise((resolve, reject) => {
            crypto.randomBytes(32, (err, buffer) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(buffer.toString('hex'));
                }
            });
        });

        const hash = await bcrypt.hash(random, 10);
        model.secret = hash;
        secrets.token = random;

        options.setSession(model);
        await model.save();

        return {model, secrets};
    }

    static async get (id, options) {
        return this.getModel().findOne({
            where: {
                id: id,
                userId: options.session.userId
            }
        });
    }

    static async list (params, options) {
        return this.getModel().findAll({
            where: {
                userId: options.session.userId
            }
        });
    }

    static async update (model, body, options) {
        const {URL} = require('url');
        const ErrorResponse = require('../helpers/errorResponse');

        const secrets = {};

        if (body.name !== undefined) {
            model.name = body.name;

            // neues secret generieren
            if(model.mobilePairing && model.id === options.session.id) {
                const crypto = require('crypto');
                secrets.token = await new Promise((resolve, reject) => {
                    crypto.randomBytes(32, (err, buffer) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(buffer.toString('hex'));
                        }
                    });
                });

                const bcrypt = require('bcryptjs');
                model.secret = await bcrypt.hash(secrets.token, 10);
            }
        }
        if (!model.name) {
            throw new ErrorResponse(400, 'Session requires attribute `name`…', {
                attributes: {
                    name: 'Is required!'
                }
            });
        }
        if (model.name.length > 255) {
            throw new ErrorResponse(400, 'Attribute `Session.name` has a maximum length of 255 chars, sorry…', {
                attributes: {
                    name: 'Is too long, only 255 characters allowed…'
                }
            });
        }


        if (body.url !== undefined) {
            model.url = body.url;
        }
        if (model.url) {
            try {
                new URL(model.url);
            }
            catch (err) {
                throw new ErrorResponse(400, 'Attribute `Session.url` seems to be invalid…', {
                    attributes: {
                        url: 'Seems to be invalid'
                    }
                });
            }
        }

        if(body.accepted !== undefined && !options.session.mobilePairing) {
            model.mobilePairing = !body.accepted;
        }

        await model.save();
        return {model, secrets};
    }

    static delete (model) {
        return model.destroy();
    }
}

module.exports = SessionLogic;