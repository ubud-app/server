'use strict';

module.exports = {
    async up (q, models, sequelize, DataTypes) {
        await q.addColumn('sessions', 'mobilePairing', {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        });
    },
    async down (q) {
        await q.removeColumn('sessions', 'mobilePairing');
    }
};
