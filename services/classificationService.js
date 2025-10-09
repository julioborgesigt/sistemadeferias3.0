// services/classificationService.js
const { User } = require('../models');
const { Op } = require('sequelize');
const db = require('../models');

/**
 * Atualiza a classificação dos usuários no banco de dados.
 * A classificação é calculada separadamente para cada grupo de categoria (IPC, EPC, DPC)
 * e para cada ano de referência, com base em regras de prioridade.
 */
async function updateUserClassification() {
  try {
    // Mapeamento dos grupos de categorias. A classificação é compartilhada dentro de cada grupo.
    const categoryGroups = {
      'IPC': ['IPC', 'IPC-P'],
      'EPC': ['EPC', 'EPC-P'],
      'DPC': ['DPC', 'DPC-P']
    };

    // Itera sobre cada grupo de categoria para calcular a classificação
    for (const groupName in categoryGroups) {
      const categoriesInGroup = categoryGroups[groupName];
      
      // Encontra todos os anos de referência distintos para o grupo atual
      const distinctYears = await User.findAll({
        attributes: [[db.sequelize.fn('DISTINCT', db.sequelize.col('ano_referencia')), 'ano_referencia']],
        where: { categoria: { [Op.in]: categoriesInGroup } },
        raw: true
      });

      // Para cada ano encontrado, recalcula a classificação
      for (const { ano_referencia } of distinctYears) {
        let users = await User.findAll({
          where: { 
            categoria: { [Op.in]: categoriesInGroup },
            ano_referencia: ano_referencia
          }
        });
        
        // Ordena os usuários com base nas regras de prioridade
        users.sort((a, b) => {
          if (a.gestante !== b.gestante) return b.gestante - a.gestante; // 1. Gestantes primeiro
          if (a.qtd_filhos !== b.qtd_filhos) return b.qtd_filhos - a.qtd_filhos; // 2. Mais filhos primeiro
          if (a.estudante !== b.estudante) return b.estudante - a.estudante; // 3. Estudantes primeiro
          if (a.doisvinculos !== b.doisvinculos) return b.doisvinculos - a.doisvinculos; // 4. Dois vínculos primeiro
          if (a.data_ingresso_dias !== b.data_ingresso_dias) return b.data_ingresso_dias - a.data_ingresso_dias; // 5. Mais antigo (maior nº de dias)
          if (a.possui_conjuge !== b.possui_conjuge) return b.possui_conjuge - a.possui_conjuge; // 6. Cônjuge servidor primeiro
          return b.data_nascimento_dias - a.data_nascimento_dias; // 7. Mais velho (maior nº de dias)
        });
  
        // Atualiza o campo 'classificacao' no banco de dados para cada usuário
        for (let i = 0; i < users.length; i++) {
          await users[i].update({ classificacao: i + 1 });
        }
      }
    }
  } catch (error) {
    console.error("Erro ao atualizar a classificação dos usuários:", error);
    // Em uma aplicação real, seria bom ter um sistema de log mais robusto aqui
    throw new Error("Falha ao atualizar a classificação.");
  }
}

module.exports = { updateUserClassification };