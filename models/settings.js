// models/Settings.js

module.exports = (sequelize, DataTypes) => {
  /**
   * Define o model 'Settings', que armazena as configurações globais do sistema,
   * principalmente os limites de vagas para marcação de férias por categoria.
   */
  const Settings = sequelize.define('Settings', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    // Limites individuais por categoria
    max_ipc: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 2,
      comment: 'Limite máximo de servidores da categoria IPC de férias simultaneamente.'
    },
    max_epc: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 2,
      comment: 'Limite máximo de servidores da categoria EPC de férias simultaneamente.'
    },
    max_dpc: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 2,
      comment: 'Limite máximo de servidores da categoria DPC de férias simultaneamente.'
    },
    // Limites individuais para categorias "-P"
    max_ipc_p: {
      type: DataTypes.INTEGER,
      defaultValue: 2,
      comment: 'Limite máximo de servidores da categoria IPC-P de férias simultaneamente.'
    },
    max_epc_p: {
      type: DataTypes.INTEGER,
      defaultValue: 2,
      comment: 'Limite máximo de servidores da categoria EPC-P de férias simultaneamente.'
    },
    max_dpc_p: {
      type: DataTypes.INTEGER,
      defaultValue: 2,
      comment: 'Limite máximo de servidores da categoria DPC-P de férias simultaneamente.'
    },
    // Limites totais por grupo de categorias (ex: IPC e IPC-P)
    max_ipc_t: {
      type: DataTypes.INTEGER,
      defaultValue: 3,
      comment: 'Limite máximo total de servidores do grupo IPC (IPC + IPC-P) de férias simultaneamente.'
    },
    max_epc_t: {
      type: DataTypes.INTEGER,
      defaultValue: 3,
      comment: 'Limite máximo total de servidores do grupo EPC (EPC + EPC-P) de férias simultaneamente.'
    },
    max_dpc_t: {
      type: DataTypes.INTEGER,
      defaultValue: 3,
      comment: 'Limite máximo total de servidores do grupo DPC (DPC + DPC-P) de férias simultaneamente.'
    }
  });

  return Settings;
};