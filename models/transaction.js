module.exports = class TransactionModelDefinition {
    static getDefinition(DataTypes) {
        return {
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: DataTypes.UUIDV4
            },
            time: {
                type: DataTypes.DATE,
                allowNull: false
            },
            payeePluginId: {
                type: DataTypes.STRING,
                allowNull: true
            },
            approved: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            memo: {
                type: DataTypes.STRING(512),
                allowNull: true
            },
            amount: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            status: {
                type: DataTypes.ENUM('pending', 'normal', 'cleared'),
                allowNull: false
            },
            locationLatitude: {
                type: DataTypes.DOUBLE,
                allowNull: true
            },
            locationLongitude: {
                type: DataTypes.DOUBLE,
                allowNull: true
            },
            locationAccuracy: {
                type: DataTypes.INTEGER,
                allowNull: true
            }
        };
    }
};