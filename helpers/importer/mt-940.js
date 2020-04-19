'use strict';

const path = require('path');
const mt940 = require('mt940-js');
const moment = require('moment');
const TransactionLogic = require('../../logic/transaction');


/**
 * MT940Importer
 *
 * @module helpers/importer/mt-940
 * @class MT940Importer
 */
class MT940Importer {
    static async check (file) {
        return path.extname(file.name).toLowerCase() === '.sta';
    }

    static async parse (file) {
        const TransactionModel = TransactionLogic.getModel();
        const transactions = [];
        const data = await mt940.read(file.data);

        data.forEach(item => {
            item.transactions.forEach(transaction => {
                transactions.push(
                    TransactionModel.build({
                        time: moment(transaction.valueDate, 'YYYY-MM-DD').toJSON(),
                        memo: transaction.description,
                        amount: parseInt(transaction.amount.toString().replace(/,|\./, ''), 10) * (transaction.isExpense ? -1 : 1),
                        pluginsOwnPayeeId: null
                    })
                );
            });
        });

        return transactions;
    }
}


module.exports = MT940Importer;
