module.exports = class UnitModelDefinition {
    static getDefinition(DataTypes) {
        return {
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: DataTypes.UUIDV4
            },
            month: {
                type: DataTypes.STRING(7),
                allowNull: false
            },
            available: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            availableLastMonth: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            income: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            budgeted: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            outflow: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            balance: {
                type: DataTypes.INTEGER,
                allowNull: false
            }
        };
    }
};