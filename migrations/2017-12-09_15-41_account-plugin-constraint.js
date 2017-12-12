'use strict';

module.exports = {
    async up (q) {
        await q.removeConstraint('accounts', 'accounts_ibfk_2');
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
    },
    async down (q) {
        await q.removeConstraint('accounts', 'accounts_ibfk_2');
        await q.addConstraint('accounts', ['pluginId'], {
            type: 'FOREIGN KEY',
            name: 'accounts_ibfk_2',
            references: {
                table: 'plugin-instances',
                field: 'id'
            },
            onDelete: 'cascade',
            onUpdate: 'cascade'
        });
    }
};
