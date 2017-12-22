'use strict';

module.exports = {
    async up (q, models, sequelize, DataTypes) {
        await q.addColumn('transactions', 'pluginsOwnMemo', {
            type: DataTypes.STRING(512),
            allowNull: true
        });
    },
    async down (q) {
        await q.removeColumn('transactions', 'pluginsOwnMemo');
    }
};
