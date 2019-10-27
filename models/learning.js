module.exports = class LearningModelDefinition {
    static getDefinition(DataTypes) {
        return {
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: DataTypes.UUIDV4
            },
            location: {
                type: DataTypes.ENUM('payee', 'memo', 'plugin:payee', 'plugin:memo'),
                allowNull: false
            },
            word: {
                type: DataTypes.STRING(32),
                allowNull: false
            }
        };
    }
};