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

    static create (attributes, options) {
        const ErrorResponse = require('../helpers/errorResponse');
        const DatabaseHelper = require('../helpers/database');
        const bcrypt = require('bcrypt');
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
            return new Promise((resolve, reject) => {
                crypto.randomBytes(32, (err, buffer) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(buffer.toString('hex'));
                    }
                });
            })
                .then(function (random) {
                    secrets.token = random;
                    return bcrypt.hash(random, 10);
                })
                .then(function (hash) {
                    model.secret = hash;
                    return model.save();
                })
                .then(function (model) {
                    return {model, secrets};
                })
                .catch(e => {
                    throw e;
                });
        }


        // logged out user: login
        return DatabaseHelper.get('user')
            .find({
                where: {
                    email: options.session.name
                }
            })
            .then(function (userModel) {
                if (!userModel) {
                    throw new ErrorResponse(401, 'Not able to authorize: Is username / password correct?');
                }

                model.userId = userModel.id;
                model.user = userModel;
                return bcrypt.compare(options.session.pass, userModel.password);
            })
            .then(function (passwordCorrect) {
                if (!passwordCorrect) {
                    throw new ErrorResponse(401, 'Not able to authorize: Is username / password correct?');
                }

                const crypto = require('crypto');
                return new Promise((resolve, reject) => {
                    crypto.randomBytes(32, (err, buffer) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(buffer.toString('hex'));
                        }
                    });
                });
            })
            .then(function (random) {
                secrets.token = random;
                return bcrypt.hash(random, 10);
            })
            .then(function (hash) {
                model.secret = hash;
                options.setSession(model);
                return model.save();
            })
            .then(function (model) {
                return {model, secrets};
            })
            .catch(e => {
                throw e;
            });
    }

    static get (id, options) {
        return this.getModel().findOne({
            where: {
                id: id,
                userId: options.session.userId
            }
        });
    }

    static list (params, options) {
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

                const bcrypt = require('bcrypt');
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