'use strict';

module.exports = {
    async up (q, models, sequelize, Sequelize) {
        await q.addColumn('units', 'transferAccountId', {
            type: Sequelize.UUID,
            allowNull: true
        });

        await q.addConstraint('units', ['transferAccountId'], {
            type: 'FOREIGN KEY',
            name: 'unit_ibfk_3',
            references: {
                table: 'accounts',
                field: 'id'
            },
            onDelete: 'cascade',
            onUpdate: 'cascade'
        });


        const [data] = await sequelize.query(
            'SELECT ' +
            '  t1.id AS t1, ' +
            '  t2.id AS t2 ' +
            'FROM transactions AS t1, transactions AS t2 ' +
            'WHERE t1.id != t2.id ' +
            '  AND t1.amount = -1 * t2.amount ' +
            '  AND t1.amount < 0 ' +
            '  AND t1.payeeId IS NULL ' +
            '  AND t2.payeeId IS NULL ' +
            '  AND t1.accountId != t2.accountId ' +
            '  AND (SELECT documentId FROM accounts WHERE accounts.id = t1.accountId) = (SELECT documentId FROM accounts WHERE accounts.id = t2.accountId)' +
            '  AND date(t1.createdAt) = date(t2.createdAt) ' +
            '  AND (SELECT COUNT(*) FROM units WHERE transactionId = t1.id) = 0 ' +
            '  AND (SELECT COUNT(*) FROM units WHERE transactionId = t2.id) = 0;'
        );

        const transfers = data.filter(({t1, t2}) =>
            data.filter(d => t1 === d.t1).length === 1 &&
            data.filter(d => t2 === d.t2).length === 1
        );

        for (const i in transfers) {
            const {t1, t2} = transfers[i];
            const transactionModels = await models.transaction.findAll({
                where: {
                    id: {
                        [Sequelize.Op.or]: [t1, t2]
                    }
                }
            });

            const unitModel = models.unit.build();
            const positive = transactionModels[1].amount > transactionModels[0].amount ? 1 : 0;
            const negative = positive ? 0 : 1;

            unitModel.amount = transactionModels[negative].amount;
            unitModel.memo = '';
            unitModel.type = 'TRANSFER';
            unitModel.transactionId = transactionModels[negative].id;
            unitModel.transferAccountId = transactionModels[positive].accountId;

            await unitModel.save();
            await transactionModels[positive].destroy();
        }
    }
};
