module.exports = class LearningModelDefinition {
	static getDefinition(DataTypes) {
		return {
			id: {
				type: DataTypes.UUID,
				primaryKey: true,
				defaultValue: DataTypes.UUIDV4
			},
			location: {
				type: DataTypes.ENUM('payee.name', 'payee.account', 'reference'),
				allowNull: false
			},
			word: {
				type: DataTypes.STRING(50),
				allowNull: false
			}
		};
	}
};