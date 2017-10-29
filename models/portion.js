module.exports = class TransactionModelDefinition {
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
			budgeted: {
				type: DataTypes.INTEGER,
				allowNull: true
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