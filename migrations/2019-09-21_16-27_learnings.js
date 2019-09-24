'use strict';

module.exports = {
    async up (q, models) {
        const TransactionLogic = require('../logic/transaction');
        let numberOfItems = null;
        let offset = 0;
        do {
            const transactions = await models.transaction.findAll({
                attributes: [
                    'id',
                    'memo',
                    'pluginsOwnPayeeId',
                    'pluginsOwnMemo'
                ],
                include: [
                    {
                        model: models.account,
                        attributes: ['documentId']
                    },
                    {
                        model: models.unit
                    },
                    {
                        model: models.payee,
                        attribute: ['id', 'name']
                    }
                ],
                limit: 50,
                offset
            });

            for(let i = 0; i < transactions.length; i++) {
                await TransactionLogic.updateLearnings(transactions[i]);
            }

            numberOfItems = transactions.length;
            offset += numberOfItems;
        } while (numberOfItems >= 50);
    }
};
