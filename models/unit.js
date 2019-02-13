module.exports = class UnitModelDefinition {
    static getDefinition(DataTypes) {
        return {
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: DataTypes.UUIDV4
            },
            amount: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            type: {
                type: DataTypes.ENUM('INCOME', 'INCOME_NEXT', 'BUDGET', 'TRANSFER'),
                allowNull: true
            },
            memo: {
                type: DataTypes.STRING(512),
                allowNull: true
            }
        };
    }
};