// models/Vacation.js

module.exports = (sequelize, DataTypes) => {
  const Vacation = sequelize.define('Vacation', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    matricula: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'Users', // Nome da tabela de referência
        key: 'matricula'
      }
    },
    periodo: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    data_inicio: {
      type: DataTypes.DATE,
      allowNull: false
    },
    data_fim: {
      type: DataTypes.DATE,
      allowNull: false
    },
    ano_referencia: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    tableName: 'Vacations',
    timestamps: true
  });

  Vacation.associate = function(models) {
    // A associação define que uma Férias (Vacation) pertence a um Usuário (User).
    // A ligação é feita usando a 'matricula' como chave estrangeira.
    Vacation.belongsTo(models.User, { 
        foreignKey: 'matricula', 
        targetKey: 'matricula' 
    });
  };

  return Vacation;
};