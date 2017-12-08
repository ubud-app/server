'use strict';

module.exports = {
    async up (q) {
        return q.renameTable('plugins', 'plugin-instances');
    },
    async down (q) {
        return q.renameTable('plugin-instances', 'plugins');
    }
};
