'use strict';

module.exports = {
    async up (q, models, sequelize) {
        await sequelize.query(
            'DELETE FROM `transactions` ' +
            'WHERE (' +
            'SELECT COUNT(*) FROM `units` WHERE `type` IS NULL AND `units`.`transactionId` = `transactions`.`id`' +
            ') = 1 ' +
            'AND `transactions`.`isReconciling` = 1;'
        );
    }
};
