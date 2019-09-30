'use strict';

module.exports = {
    async up (q, models, sequelize, DataTypes) {
        await models.learning.truncate();

        await q.changeColumn('learnings', 'location', {
            type: DataTypes.ENUM('payee', 'memo', 'plugin:payee', 'plugin:memo'),
            allowNull: false
        });

        try {
            await q.removeConstraint('learnings', 'learnings_ibfk_2');
        }
        catch(err) {
            // ignored
        }

        try {
            await q.removeColumn('learnings', 'categoryId');
        }
        catch(err) {
            // ignored
        }

        await q.addColumn('learnings', 'budgetId',{
            type: DataTypes.UUID,
            allowNull: false
        });
        await q.addConstraint('learnings', ['budgetId'], {
            type: 'FOREIGN KEY',
            name: 'learnings_ibfk_2',
            references: {
                table: 'budgets',
                field: 'id'
            },
            onDelete: 'cascade',
            onUpdate: 'cascade'
        });

        await q.changeColumn('learnings', 'word', {
            type: DataTypes.STRING(32),
            allowNull: false
        });

        await q.addColumn('learnings', 'transactionId',{
            type: DataTypes.UUID,
            allowNull: false
        });
        await q.addConstraint('learnings', ['transactionId'], {
            type: 'FOREIGN KEY',
            name: 'learnings_ibfk_3',
            references: {
                table: 'transactions',
                field: 'id'
            },
            onDelete: 'cascade',
            onUpdate: 'cascade'
        });

        await q.addIndex('learnings', ['location', 'word', 'documentId'], {
            name: 'learnings_guess'
        });

        await q.addIndex('learnings', ['location', 'word', 'transactionId'], {
            unique: true,
            name: 'learnings_unique'
        });

        await q.addIndex('learnings', ['transactionId'], {
            name: 'learnings_sync'
        });
    }
};
