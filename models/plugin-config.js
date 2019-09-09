module.exports = class PluginConfigModelDefinition {
    static getDefinition(DataTypes) {
        return {
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: DataTypes.UUIDV4
            },
            key: {
                type: DataTypes.STRING,
                allowNull: false
            },
            value: {
                type: DataTypes.STRING(2048),
                allowNull: true
            }
        };
    }
};