'use strict';

module.exports = {
    async up (q, models, sequelize, Sequelize) {
        const instances = await models['plugin-instance'].findAll({
            where: {
                type: {
                    [Sequelize.Op.startsWith]: '@dwimm/'
                }
            }
        });

        for(let i = 0; i < instances.length; i++) {
            const instance = instances[i];
            instance.type = '@ubud-app/' + instance.type.substr(7);
            await instance.save();
        }
    },
    async down (q, models, sequelize, Sequelize) {
        const instances = await models['plugin-instance'].findAll({
            where: {
                type: {
                    [Sequelize.Op.startsWith]: '@ubud-app/'
                }
            }
        });

        for(let i = 0; i < instances.length; i++) {
            const instance = instances[i];
            instance.type = '@dwimm/' + instance.type.substr(10);
            await instance.save();
        }
    }
};
