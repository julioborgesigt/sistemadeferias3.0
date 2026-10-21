module.exports = (sequelize, DataTypes) => {
  const Cobertura = sequelize.define('Cobertura', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    lotacao_a: { type: DataTypes.STRING(80), allowNull: false },
    lotacao_b: { type: DataTypes.STRING(80), allowNull: false }
  }, {
    indexes: [{ unique: true, fields: ['lotacao_a', 'lotacao_b'] }]
  });

  return Cobertura;
};
