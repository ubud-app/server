'use strict';

module.exports = {
    async up(q, models, sequelize, DataTypes) {
        await q.createTable('plugin-configs', {
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: DataTypes.UUIDV4
            },
            key: {
                type: DataTypes.STRING,
                allowNull: false
            },
            value: {
                type: DataTypes.STRING,
                allowNull: true
            },
            createdAt: {
                allowNull: false,
                type: DataTypes.DATE
            },
            updatedAt: {
                allowNull: false,
                type: DataTypes.DATE
            },
            pluginInstanceId: {
                type: DataTypes.UUID,
                allowNull: false
            }
        });

        await q.addConstraint('plugin-configs', ['pluginInstanceId'], {
            type: 'FOREIGN KEY',
            name: 'plugin-config_ibfk_1',
            references: {
                table: 'plugin-instances',
                field: 'id'
            },
            onDelete: 'cascade',
            onUpdate: 'cascade'
        });
    },
    async down(q) {
        await q.dropTable('plugin-configs');
    }
};
