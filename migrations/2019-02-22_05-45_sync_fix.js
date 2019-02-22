'use strict';

module.exports = {
    async up (q, models, sequelize) {
        await sequelize.query(
            'DELETE FROM transactions ' +
            'WHERE createdAt >= "2019-02-15" && ' +
            'createdAt < "2019-02-22" && ' +
            'isReconciling = 1;'
        );
    }
};
