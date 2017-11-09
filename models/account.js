const AccountLogic = require('../logic/account');

module.exports = class AccountModelDefinition {
    static getDefinition(DataTypes) {
        return {
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: DataTypes.UUIDV4
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false
            },
            type: {
                type: DataTypes.ENUM(AccountLogic.getValidTypeValues()),
                allowNull: false
            },
            number: {
                type: DataTypes.STRING,
                allowNull: true
            },
            hidden: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            }
        };
    }
};