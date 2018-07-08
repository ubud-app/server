'use strict';


/**
 * ImporterHelper
 *
 * @module helpers/importer
 * @class ImporterHelper
 */
class ImporterHelper {
    static initialize () {
        if(this.initialized) {
            return;
        }

        this.importers = [
            require('./csv'),
            require('./mt-940'),
            require('./ofx')
        ];

        this.initialized = true;
    }

    /**
     * Parse the given file
     * @param {Model} account AccountModel
     * @param {object} file
     * @param {String} file.name
     * @param {Buffer} file.data
     * @param {String} file.mime
     * @returns {Promise<Array<Model>>}
     */
    static async parse (account, file) {
        this.initialize();

        let myImporter;
        for(const importerId in this.importers) {
            const importer = this.importers[importerId];
            const usable = await importer.check(file);

            if(usable) {
                myImporter = importer;
                break;
            }
        }
        if(!myImporter) {
            throw new Error('Unable to import file `' + file.name + '`: no parser found for file');
        }

        const transactions = await myImporter.parse(file);
        return transactions.map(t => {
            t.accountId = account.id;
            return t;
        });
    }
}


module.exports = ImporterHelper;