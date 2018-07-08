'use strict';

const path = require('path');
const neatCsv = require('neat-csv');
const moment = require('moment');
const TransactionLogic = require('../../logic/transaction');

const csv2transactionMap = {
    time: [
        ['Buchungstag', 'DD-MM-YY'],
        ['Wertstellung', 'DD-MM-YY'],
        ['Datum', 'DD-MM-YY'],
        ['Valutadatum', 'DD-MM-YY']
    ],
    pluginsOwnPayeeId: [
        ['Beguenstigter/Zahlungspflichtiger'],
        ['Name']
    ],
    memo: [
        ['Verwendungszweck']
    ],
    amount: [
        ['Betrag']
    ]
};


/**
 * CSVImporter
 *
 * @module helpers/importer/csv
 * @class CSVImporter
 */
class CSVImporter {
    static async check (file) {
        return file.mime === 'text/csv' || path.extname(file.name).toLowerCase() === '.csv';
    }

    static async parse (file) {
        const TransactionModel = TransactionLogic.getModel();
        const csv = await neatCsv(file.data, {separator: ';'});

        return csv.map(row => {
            const model = TransactionModel.build();

            Object.entries(csv2transactionMap).forEach(([attr, def]) => {
                def.forEach(([possibleColumn, momentFormat]) => {
                    if (model[attr]) {
                        return;
                    }

                    if (row[possibleColumn] && attr === 'time') {
                        const time = moment(row[possibleColumn], momentFormat);
                        if (time && time.isValid()) {
                            model[attr] = time.toJSON();
                        }
                    }
                    else if (row[possibleColumn] && attr === 'amount') {
                        const amount = parseInt(row[possibleColumn].replace(/,|\./, ''), 10);
                        if (!isNaN(amount)) {
                            model[attr] = amount;
                        }
                    }
                    else if (row[possibleColumn] !== undefined) {
                        model[attr] = row[possibleColumn];
                    }
                });

                if(model[attr] === undefined) {
                    throw new Error(
                        'Unable to import CSV: no value found for `' + attr + '`, parsed this data: ' +
                        JSON.stringify(row, null, '  ')
                    );
                }
            });

            return model;
        });
    }
}


module.exports = CSVImporter;