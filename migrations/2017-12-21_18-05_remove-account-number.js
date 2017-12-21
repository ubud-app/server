'use strict';

module.exports = {
    async up (q) {
        await q.removeColumn('accounts', 'number');
    },
    async down (q, models, sequelize, DataTypes) {
        await q.addColumn('accounts', 'number', {
            type: DataTypes.STRING,
            allowNull: true
        });
    }
};
