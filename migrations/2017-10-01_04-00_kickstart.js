'use strict';

module.exports = {
    up: function (models, sequelize) {
        return sequelize.sync({force: true});
    },
    down: function (models, sequelize) {
        return sequelize.sync({force: true});
    }
};
