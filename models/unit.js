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
            memo: {
                type: DataTypes.STRING(512),
                allowNull: true
            },
            incomeMonth: {
                type: DataTypes.ENUM('this', 'next'),
                allowNull: true
            }
        };
    }
};