'use strict';

module.exports = {
    async up (q, models, sequelize) {
        const [tables] = await sequelize.query(
            'SELECT table_name AS c ' +
            'FROM information_schema.tables ' +
            'WHERE table_schema = DATABASE()');


        await sequelize.query('SET FOREIGN_KEY_CHECKS=0;');

        for(let i in tables) {
            await sequelize.query(`ALTER TABLE \`${tables[i].c}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;`);
        }

        await sequelize.query('SET FOREIGN_KEY_CHECKS=1;');
    },

    async down (q, models, sequelize) {
        const [tables] = await sequelize.query(
            'SELECT table_name AS c ' +
            'FROM information_schema.tables ' +
            'WHERE table_schema = DATABASE()');


        await sequelize.query('SET FOREIGN_KEY_CHECKS=0;');

        for(let i in tables) {
            await sequelize.query(`ALTER TABLE \`${tables[i].c}\` CONVERT TO CHARACTER SET utf8 COLLATE utf8_general_ci;`);
        }

        await sequelize.query('SET FOREIGN_KEY_CHECKS=1;');
    }
};
