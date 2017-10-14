module.exports = class TransactionModelDefinition {
	static getDefinition(DataTypes) {
		return {
			id: {
				type: DataTypes.UUID,
				primaryKey: true,
				defaultValue: DataTypes.UUIDV4
			},
			date: {
				type: DataTypes.STRING(7),
				allowNull: false
			}
		};
	}
};