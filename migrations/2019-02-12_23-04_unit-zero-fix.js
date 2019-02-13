'use strict';

module.exports = {
    async up (q, models, sequelize, Sequelize) {
        await models.unit.destroy({
            where: {
                amount: {
                    [Sequelize.Op.eq]: 0
                }
            }
        });
    },
    async down () {
        // nothing to do :)
    }
};
