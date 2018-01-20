module.exports = class SettingModelDefinition {
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
                type: DataTypes.STRING,
                allowNull: true
            }
        };
    }

    static getIndexes() {
        return [
            {
                unique: true,
                fields: ['documentId', 'key']
            }
        ];
    }
};