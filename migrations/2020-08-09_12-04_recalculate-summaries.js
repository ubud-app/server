'use strict';

module.exports = {
    async up (q) {
        await q.bulkDelete('summaries', {}, {
            truncate: true
        });
    }
};
