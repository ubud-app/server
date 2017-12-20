'use strict';

module.exports = {
    async up (q, models, sequelize, DataTypes) {
        await q.addColumn('accounts', 'pluginsOwnId', {
            type: DataTypes.STRING,
            allowNull: true
        });
        await q.addColumn('budgets', 'pluginsOwnId', {
            type: DataTypes.STRING,
            allowNull: true
        });
        await q.addColumn('transactions', 'pluginsOwnId', {
            type: DataTypes.STRING,
            allowNull: true
        });
    },
    async down (q, models, sequelize) {
        await q.removeColumn('accounts', 'pluginsOwnId');
        await q.removeColumn('budgets', 'pluginsOwnId');
        await q.removeColumn('transactions', 'pluginsOwnId');
    }
};
