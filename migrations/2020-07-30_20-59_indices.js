'use strict';

module.exports = {
    async up (q) {
        await q.addIndex('accounts', ['name', 'documentId', 'pluginInstanceId'], {
            name: 'account_query_index'
        });
        await q.addIndex('budgets', ['id', 'name', 'categoryId', 'pluginInstanceId', 'hidden'], {
            name: 'budget_query_index'
        });
        await q.addIndex('categories', ['id', 'name', 'documentId'], {
            name: 'category_query_index'
        });
        await q.addIndex('documents', ['id', 'name'], {
            name: 'document_query_index'
        });
        await q.addIndex('payees', ['name', 'documentId'], {
            name: 'payee_query_index'
        });
        await q.addIndex('plugin-configs', ['pluginInstanceId', 'key'], {
            name: 'plugin-config_query_index'
        });
        await q.addIndex('plugin-stores', ['pluginInstanceId', 'key'], {
            name: 'plugin-store_query_index'
        });
        await q.addIndex('portions', ['month', 'budgetId'], {
            name: 'portion_query_index'
        });
        await q.addIndex('sessions', ['userId'], {
            name: 'session_query_index'
        });
        await q.addIndex('shares', ['id', 'userId', 'documentId'], {
            name: 'share_query_index'
        });
        await q.addIndex('summaries', ['month', 'documentId'], {
            name: 'summary_query_index'
        });
        await q.addIndex('transactions', ['time', 'accountId', 'status'], {
            name: 'transaction_query_index'
        });
        await q.addIndex('units', ['id', 'transactionId'], {
            name: 'unit_query_index'
        });
    }
};
