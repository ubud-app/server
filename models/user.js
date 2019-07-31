module.exports = class UserModelDefinition {
    static getDefinition(DataTypes) {
        return {
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                defaultValue: DataTypes.UUIDV4
            },
            email: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true
            },
            password: {
                type: DataTypes.STRING,
                allowNull: false
            },
            isAdmin: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            needsPasswordChange: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            acceptedTermVersion: {
                type: DataTypes.INTEGER.UNSIGNED,
                allowNull: true,
                defaultValue: null
            },
            otpKey: {
                type: DataTypes.STRING,
                allowNull: true
            },
            otpEnabled: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            }
        };
    }
};