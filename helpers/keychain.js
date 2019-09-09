'use strict';

const crypto = require('crypto');
const EventEmitter = require('events');

const DatabaseHelper = require('../helpers/database');
const LogHelper = require('./log');
const log = new LogHelper('KeychainHelper');

let keychainKey = null;
const events = new EventEmitter();
const algorithm = 'aes-256-ctr';


/**
 * KeychainHelper
 *
 * @module helpers/keychain
 * @class KeychainHelper
 */
class KeychainHelper {

    /**
     * Returns true, if the keychain is currently unlocked.
     *
     * @returns {boolean}
     */
    static isUnlocked () {
        return !!keychainKey;
    }

    /**
     * Returns true, if the keychain is currently locked.
     *
     * @returns {boolean}
     */
    static isLocked () {
        return !keychainKey;
    }

    /**
     * Returns a promise which resolves when the keychain
     * gets unlocked. Instantly resolves, if the database
     * is already in unlocked state.
     *
     * @returns {Promise<void>}
     */
    static async waitTillUnlocked () {
        if (this.isUnlocked()) {
            return Promise.resolve();
        }

        return new Promise(resolve => {
            this.events().once('unlocked', () => resolve());
        });
    }

    /**
     * Returns the EventEmitter instance which reflects
     * all keychain events for this server instance.
     *
     * @returns {EventEmitter}
     * @instance
     */
    static events () {
        return events;
    }

    /**
     * Encrypts the given, json-serializable object and returns
     * the encrypted string. Only possible if keychain is unlocked.
     * otherwise will throw an error.
     *
     * @param {string|number|null|object} data
     * @returns {String}
     */
    static async encrypt (data) {
        if (this.isLocked()) {
            throw new Error('Impossible to encrypt given data: keychain is locked!');
        }

        let string;
        try {
            string = JSON.stringify(data);
        }
        catch (error) {
            throw new Error(`Impossible to encrypt given data: object is not serializable (${error.toString()})`);
        }

        return KeychainHelper._encrypt(string, keychainKey);
    }

    /**
     * Encrypts the given string and returns the encrypted one.
     *
     * @param {String} input
     * @param {String|Hash} key
     * @returns {Promise<string>}
     * @private
     */
    static async _encrypt (input, key) {
        const secret = crypto.createHash('sha256').update(key).digest();
        const iv = crypto.randomBytes(16);

        const cipher = crypto.createCipheriv(algorithm, secret, iv);

        let encrypted = cipher.update(input, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        return iv.toString('hex') + '!' + encrypted;
    }

    /**
     * Decrypts the given string and returns the object.
     * Only possible if keychain is unlocked, otherwise
     * will throw an error.
     *
     * @param {String} input
     * @returns {String|Number|null|Object}
     */
    static async decrypt (input) {
        if (this.isLocked()) {
            throw new Error('Impossible to decrypt given data: keychain is locked!');
        }

        const dec = await KeychainHelper._decrypt(input, keychainKey);
        return JSON.parse(dec);
    }

    /**
     * Decrypts the given string and returns the original one.
     *
     * @param {String} input
     * @param {String|Buffer} key
     * @returns {Promise<string>}
     * @private
     */
    static async _decrypt (input, key) {
        const secret = crypto.createHash('sha256').update(key).digest();
        const inputParts = input.split('!', 2);
        const iv = Buffer.from(inputParts[0], 'hex');

        const decipher = crypto.createDecipheriv(algorithm, secret, iv);

        let dec = decipher.update(inputParts[1], 'hex', 'utf8');
        dec += decipher.final('utf8');

        return dec;
    }

    /**
     * Try to unlock and initialize the keychain for the given user.
     * Password should be checked already. Woun't throw any errors in
     * case this is not possible unless`options.force` is set to true.
     *
     * @param {Sequelize.Model} userModel   – UserModel of the user trying to unlock keychain
     * @param {String} password             – Cleartext password of the user
     * @param {Object} [options]
     * @param {Boolean} [options.force]     – Force unlock. Will throw an error, if unlock is not possible.
     * @param {Boolean} [options.dontSave]  – If set to true, unlock() wount save model changes in database, you need to
     *                                        do this yourself afterwards if this is set.
     */
    static async unlock (userModel, password, options = {}) {
        if (!userModel.isAdmin && options.force) {
            throw new Error('Unable to unlock keychain: You are not an admin!');
        }
        if (!userModel.isAdmin) {
            return;
        }

        // initialize keychain
        if (this.isLocked() && !userModel.keychainKey) {
            const numberOfUsersWithKeychainKey = await DatabaseHelper.get('user')
                .count({
                    where: {
                        keychainKey: {
                            [DatabaseHelper.op('not')]: null
                        }
                    }
                });

            if (!numberOfUsersWithKeychainKey) {
                const key = crypto.randomBytes(256);
                await KeychainHelper.migrateDatabase(key);

                console.log('---------');
                console.log('Keychain Secret:', key.toString('hex'));
                console.log('---------');

                keychainKey = key;
                events.emit('unlocked');

                log.info('Keychain set up with new, random secret. Now in unlocked state.');
            }
        }

        // setup keychainKey for user
        if (!userModel.keychainKey && this.isUnlocked()) {
            userModel.keychainKey = await KeychainHelper._encrypt(
                keychainKey.toString('hex'),
                password
            );

            if (!options.dontSave) {
                await userModel.save();
            }

            log.info(`Updated keychain key of user ${userModel.id}. User is now able to unlock keychain.`);
        }

        // throw error if unlock is not possible
        if (!userModel.keychainKey && this.isLocked() && options.force) {
            throw new Error('Unable to unlock keychain: Unlock not possible with this user, unlock with another admin user.');
        }

        // do unlock
        if (userModel.keychainKey && this.isLocked()) {
            const keychainKeyString = await KeychainHelper._decrypt(userModel.keychainKey, password);
            keychainKey = Buffer.from(keychainKeyString, 'hex');

            events.emit('unlocked');
            log.info(`Keychain unlocked by user ${userModel.id}.`);
        }
    }

    static async migrateDatabase (key) {
        const types = ['plugin-config', 'plugin-store'];
        for (let i in types) {
            const type = types[i];
            const pluginConfigs = await DatabaseHelper.get(type).findAll({
                attributes: ['id', 'value']
            });

            for (let j in pluginConfigs) {
                const model = pluginConfigs[j];
                model.value = await KeychainHelper._encrypt(model.value, key);

                await model.save();
            }
        }
    }
}


module.exports = KeychainHelper;