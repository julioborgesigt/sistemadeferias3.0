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
    },
    pct_primeiro_ipc: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 15,
      comment: 'Percentual do efetivo de IPC que pode iniciar o 1º período ou período único no mesmo mês.'
    },
    pct_primeiro_epc: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 15,
      comment: 'Percentual do efetivo de EPC que pode iniciar o 1º período ou período único no mesmo mês.'
    },
    pct_primeiro_dpc: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 15,
      comment: 'Percentual do efetivo de DPC que pode iniciar o 1º período ou período único no mesmo mês.'
    },
    max_seguintes_ipc: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Máximo de servidores de IPC em 2º ou 3º período ao mesmo tempo. Nulo usa 20% do efetivo.'
    },
    max_seguintes_epc: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Máximo de servidores de EPC em 2º ou 3º período ao mesmo tempo. Nulo usa 20% do efetivo.'
    },
    max_seguintes_dpc: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Máximo de servidores de DPC em 2º ou 3º período ao mesmo tempo. Nulo usa 20% do efetivo.'
    },
    tolerancia_dias_ipc: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Dias úteis de choque ignorados entre férias de servidores do cargo IPC.'
    },
    tolerancia_dias_epc: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Dias úteis de choque ignorados entre férias de servidores do cargo EPC.'
    },
    tolerancia_dias_dpc: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Dias úteis de choque ignorados entre férias de servidores do cargo DPC.'
    }
  });

  return Settings;
};