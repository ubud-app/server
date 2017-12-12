'use strict';

module.exports = {
    async up (q, models, sequelize) {
        await q.removeConstraint('accounts', 'accounts_ibfk_2');
        await q.renameColumn('accounts', 'pluginId', 'pluginInstanceId');
        await sequelize.query('ALTER TABLE accounts MODIFY pluginInstanceId CHAR(36) CHARACTER SET utf8 COLLATE utf8_bin;');
        await q.addConstraint('accounts', ['pluginInstanceId'], {
            type: 'FOREIGN KEY',
            name: 'accounts_ibfk_2',
            references: {
                table: 'plugin-instances',
                field: 'id'
            },
            onDelete: 'set null',
            onUpdate: 'set null'
        });
    },
    async down (q, models, sequelize) {
        await q.removeConstraint('accounts', 'accounts_ibfk_2');
        await q.renameColumn('accounts', 'pluginInstanceId', 'pluginId');
        await sequelize.query('ALTER TABLE accounts MODIFY pluginId CHAR(36) CHARACTER SET utf8 COLLATE utf8_general_ci;');
        await q.addConstraint('accounts', ['pluginId'], {
            type: 'FOREIGN KEY',
            name: 'accounts_ibfk_2',
            references: {
                table: 'plugin-instances',
                field: 'id'
            },
            onDelete: 'set null',
            onUpdate: 'set null'
        });
    }
};
