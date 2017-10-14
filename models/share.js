module.exports = class ShareModelDefinition {
	static getDefinition(DataTypes) {
		return {
			id: {
				type: DataTypes.UUID,
				primaryKey: true,
				defaultValue: DataTypes.UUIDV4
			}
		};
	}
};