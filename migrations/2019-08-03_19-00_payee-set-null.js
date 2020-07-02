'use strict';

module.exports = {
    async up (q) {
        await q.removeConstraint('transactions', 'transactions_ibfk_2');
        await q.addConstraint('transactions', {
            type: 'FOREIGN KEY',
            name: 'transactions_ibfk_2',
            fields: ['payeeId'],
            references: {
                table: 'payees',
                field: 'id'
            },
            onDelete: 'set null',
            onUpdate: 'set null'
        });
    },
    async down (q) {
        await q.removeConstraint('transactions', 'transactions_ibfk_2');
        await q.addConstraint('transactions', {
            type: 'FOREIGN KEY',
            name: 'transactions_ibfk_2',
            fields: ['payeeId'],
            references: {
                table: 'payees',
                field: 'id'
            },
            onDelete: 'cascade',
            onUpdate: 'cascade'
        });
    }
};
