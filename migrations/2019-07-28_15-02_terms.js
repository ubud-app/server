'use strict';

module.exports = {
    async up (q, models, sequelize, DataTypes) {
        await q.addColumn('users', 'acceptedTermVersion', {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: true,
            defaultValue: null
        });

    },
    async down (q) {
        await q.removeColumn('users', 'acceptedTermVersion');
    }
};
