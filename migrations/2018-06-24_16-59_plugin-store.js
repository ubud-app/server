'use strict';

module.exports = {
    async up(q, models, sequelize, DataTypes) {
        await q.createTable('plugin-stores', {
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
                type: DataTypes.TEXT,
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

        await q.addConstraint('plugin-stores', ['pluginInstanceId'], {
            type: 'FOREIGN KEY',
            name: 'plugin-store_ibfk_1',
            references: {
                table: 'plugin-instances',
                field: 'id'
            },
            onDelete: 'cascade',
            onUpdate: 'cascade'
        });
    },
    async down(q) {
        await q.dropTable('plugin-stores');
    }
};
