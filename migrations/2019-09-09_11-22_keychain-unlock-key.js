'use strict';

module.exports = {
    async up (q, models, sequelize, DataTypes) {
        await q.addColumn('users', 'keychainKey', {
            type: DataTypes.STRING(2048),
            allowNull: true,
            defaultValue: null
        });

        await q.changeColumn('plugin-configs', 'value', {
            type: DataTypes.STRING(2048),
            allowNull: true
        });
    },
    async down (q, models, sequelize, DataTypes) {
        await q.removeColumn('users', 'keychainKey');

        await q.changeColumn('plugin-configs', 'value', {
            type: DataTypes.STRING,
            allowNull: true
        });
    }
};
