'use strict';

module.exports = {
    async up (q, models, sequelize, Sequelize) {
        await q.addColumn('units', 'type', {
            type: Sequelize.ENUM('INCOME', 'INCOME_NEXT', 'BUDGET', 'TRANSFER'),
            allowNull: true,
            default: null
        });

        let unitEntries;
        do {
            unitEntries = await sequelize.query(
                'SELECT * FROM `units` WHERE `type` IS NULL LIMIT 25;',
                {type: sequelize.QueryTypes.SELECT}
            );

            await Promise.all(unitEntries.map(entry => {
                const data = Object.assign({}, entry);
                delete data.incomeMonth;

                const unit = models.unit.build(data, {
                    isNewRecord: false
                });

                if(entry.budgetId) {
                    unit.type = 'BUDGET';
                }
                else if(entry.incomeMonth === 'this') {
                    unit.type = 'INCOME';
                }
                else if(entry.incomeMonth === 'next') {
                    unit.type = 'INCOME_NEXT';
                }
                else {
                    throw new Error('UnitTypesMigration: Unable to detect type for ' + JSON.stringify(unit));
                }

                return unit.save();
            }));
        } while (unitEntries.length > 0);

        await q.removeColumn('units', 'incomeMonth');
    },
    async down () {
        throw new Error('Unable to reverse this migration!');
    }
};
