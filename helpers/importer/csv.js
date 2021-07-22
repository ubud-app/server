'use strict';

const path = require('path');
const neatCsv = require('neat-csv');
const moment = require('moment');
const TransactionLogic = require('../../logic/transaction');

const csv2transactionMap = {
    time: [
        ['Belegdatum', ['DD.MM.YYYY', 'DD.MM.YY']],
        ['Buchungstag', ['DD-MM-YY', 'DD.MM.YYYY']],
        ['Wertstellung', 'DD-MM-YY'],
        ['Datum', ['DD-MM-YYYY', 'DD.MM.YYYY', 'DD-MM-YY', 'YYYY-MM-DD']],
        ['Valutadatum', 'DD-MM-YY']
    ],
    pluginsOwnPayeeId: [
        ['Beguenstigter/Zahlungspflichtiger'],
        ['Name'],
        ['Transaktionsbeschreibung'],
        ['Empfänger'],
        ['Auftraggeber / Begünstigter'],
        ['Beschreibung']
    ],
    memo: [
        ['Verwendungszweck'],
        ['Transaktionsbeschreibung'],
        ['Beschreibung']
    ],
    amount: [
        ['Betrag'],
        ['Buchungsbetrag'],
        ['Betrag (EUR)']
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
        const data = file.data.toString('latin1').split('\n\n').pop();

        let csv = await neatCsv(data, {separator: ';'});
        if(Object.keys(csv[0]).length < 2) {
            csv = await neatCsv(data, {separator: ','});
        }

        return csv.map(row => {
            const model = TransactionModel.build();

            Object.entries(csv2transactionMap).forEach(([attr, def]) => {
                def.forEach(([possibleColumn, momentFormat]) => {
                    if (model[attr]) {
                        return;
                    }

                    if (row[possibleColumn] && attr === 'time') {
                        const momentFormats = Array.isArray(momentFormat) ?
                            momentFormat.filter(f => f.length === row[possibleColumn].length) :
                            [momentFormat];

                        const time = moment(row[possibleColumn], momentFormats);
                        if (time && time.isValid()) {
                            model[attr] = time.toJSON();
                        }
                    }
                    else if (row[possibleColumn] && attr === 'amount') {
                        const amount = parseInt(row[possibleColumn].replace(/,|\./g, ''), 10);
                        if (!isNaN(amount) && amount !== 0) {
                            model[attr] = amount;
                        }
                        if (amount === 0) {
                            return;
                        }
                    }
                    else if (typeof row[possibleColumn] === 'string') {
                        model[attr] = row[possibleColumn].trim();
                    }
                });

                // Some banks add transactions with an amount of
                // 0 to send messages to their customers…
                if (model[attr] === undefined && attr !== 'amount') {
                    throw new Error(
                        'Unable to import CSV: no value found for `' + attr + '`, parsed this data: ' +
                        JSON.stringify(row, null, '  ')
                    );
                }
            });

            if(!model.amount) {
                return null;
            }

            return model;
        }).filter(Boolean);
    }
}


module.exports = CSVImporter;
