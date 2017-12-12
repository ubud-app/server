'use strict';

module.exports = {
    async up (q, models, sequelize) {
        await q.removeConstraint('budgets', 'budgets_ibfk_1');
        await q.renameColumn('budgets', 'pluginId', 'pluginInstanceId');
        await sequelize.query('ALTER TABLE budgets MODIFY pluginInstanceId CHAR(36) CHARACTER SET utf8 COLLATE utf8_bin;');
        await q.addConstraint('budgets', ['pluginInstanceId'], {
            type: 'FOREIGN KEY',
            name: 'budgets_ibfk_1',
            references: {
                table: 'plugin-instances',
                field: 'id'
            },
            onDelete: 'set null',
            onUpdate: 'set null'
        });
    },
    async down (q, models, sequelize) {
        await q.removeConstraint('budgets', 'budgets_ibfk_1');
        await q.renameColumn('budgets', 'pluginInstanceId', 'pluginId');
        await sequelize.query('ALTER TABLE budgets MODIFY pluginId CHAR(36) CHARACTER SET utf8 COLLATE utf8_general_ci;');
        await q.addConstraint('budgets', ['pluginId'], {
            type: 'FOREIGN KEY',
            name: 'budgets_ibfk_1',
            references: {
                table: 'plugin-instances',
                field: 'id'
            },
            onDelete: 'set null',
            onUpdate: 'set null'
        });
    }
};
