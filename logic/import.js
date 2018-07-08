'use strict';

const BaseLogic = require('./_');
const ErrorResponse = require('../helpers/errorResponse');


class ImportLogic extends BaseLogic {
    static getModelName () {
        return 'import';
    }

    static getPluralModelName () {
        return 'imports';
    }

    static async format (i) {
        return i;
    }

    static async create (body, options) {
        const ImporterHelper = require('../helpers/importer');
        const DatabaseHelper = require('../helpers/database');
        const TransactionLogic = require('../logic/transaction');
        const AccountLogic = require('../logic/account');

        const req = options.httpRequest;
        if (!req) {
            throw new ErrorResponse(400, 'You can only do uploads via HTTP API, sorry…');
        }

        const accountId = req.query.account || req.body.account || req.query.accountId || req.body.accountId;
        if (!accountId) {
            throw new ErrorResponse(400, 'You need to select an account id before!', {
                account: 'Is empty'
            });
        }

        const account = await AccountLogic.getModel().findOne({
            where: {
                id: accountId
            },
            include: [{
                model: DatabaseHelper.get('document'),
                attributes: [],
                include: DatabaseHelper.includeUserIfNotAdmin(options.session)
            }]
        });
        if (!account) {
            throw new ErrorResponse(400, 'You can only do uploads via HTTP API, sorry…', {
                account: 'Is not valid'
            });
        }
        if (account.pluginInstanceId) {
            throw new ErrorResponse(400, 'It\'s not allowed to do an import on managed accounts', {
                account: 'Is managed, choose another one'
            });
        }

        await Promise.all(
            Object.values(req.files).map(file => (async () => {
                const transactions = await ImporterHelper.parse(account, {
                    name: file.name,
                    data: file.data,
                    mime: file.mimetype
                });

                await TransactionLogic.syncTransactions(account, transactions);
            })())
        );

        return {
            model: {
                success: true
            }
        };
    }
}

module.exports = ImportLogic;