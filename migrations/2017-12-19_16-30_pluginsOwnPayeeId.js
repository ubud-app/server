'use strict';

module.exports = {
    async up (q) {
        await q.renameColumn('transactions', 'payeePluginId', 'pluginsOwnPayeeId');
    },
    async down (q) {
        await q.renameColumn('transactions', 'pluginsOwnPayeeId', 'payeePluginId');
    }
};
