'use strict';

module.exports = {
    async up (q) {
        await q.removeConstraint('transactions', 'transactions_ibfk_2');
        await q.addConstraint('transactions', ['payeeId'], {
            type: 'FOREIGN KEY',
            name: 'transactions_ibfk_2',
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
        await q.addConstraint('transactions', ['payeeId'], {
            type: 'FOREIGN KEY',
            name: 'transactions_ibfk_2',
            references: {
                table: 'payees',
                field: 'id'
            },
            onDelete: 'cascade',
            onUpdate: 'cascade'
        });
    }
};
