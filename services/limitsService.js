// services/limitsService.js (VERSÃO FINAL COM CONSULTA SEPARADA E LOGS)
const { Op } = require('sequelize');
const { Vacation, User, Settings } = require('../models');
const { formatDateToBR } = require('../utils/dateUtils');

async function checkVacationLimits(userCategory, startDate, endDate, ano_referencia, matriculaToExclude = null) {
  const settings = await Settings.findOne({ where: { id: 1 } });
  if (!settings) throw new Error('Configurações de limites não encontradas.');

  const groupMapping = {
    'IPC': 'IPC', 'IPC-P': 'IPC',
    'EPC': 'EPC', 'EPC-P': 'EPC',
    'DPC': 'DPC', 'DPC-P': 'DPC'
  };
  const userGroupName = groupMapping[userCategory];
  const categoriesInGroup = [`${userGroupName}`, `${userGroupName}-P`];
  const maxGroupLimit = settings[`max_${userGroupName.toLowerCase()}_t`];

  // --- INÍCIO DA NOVA ESTRATÉGIA ---

  // 1. Primeira consulta: Busca apenas as matrículas e nomes dos usuários no grupo de risco.
  const targetUsers = await User.findAll({
    attributes: ['matricula', 'nome'],
    where: {
      categoria: { [Op.in]: categoriesInGroup },
      ano_referencia: ano_referencia
    },
    raw: true // Retorna objetos simples, mais leve
  });

  // Se não houver usuários nesse grupo, não há o que verificar.
  if (targetUsers.length === 0) {
    return { allowed: true, message: 'Nenhum usuário no grupo para verificar.' };
  }
  
  // Cria um mapa para buscar o nome do usuário facilmente depois: { 'matricula': 'Nome' }
  const userMap = new Map(targetUsers.map(u => [u.matricula, u.nome]));
  const targetMatriculas = Array.from(userMap.keys());


  // 2. Segunda consulta: Busca as férias APENAS para essas matrículas, sem 'include'.
  const vacationWhereClause = {
    ano_referencia: ano_referencia,
    data_inicio: { [Op.lte]: endDate },
    data_fim: { [Op.gte]: startDate },
    matricula: { [Op.in]: targetMatriculas }
  };

  if (matriculaToExclude) {
    // Garante que a exclusão não sobrescreva o filtro de matrículas
    const matriculasToSearch = targetMatriculas.filter(m => m !== matriculaToExclude);
    vacationWhereClause.matricula = { [Op.in]: matriculasToSearch };
  }

  // Esta consulta agora retorna uma lista LIMPA de férias, sem duplicatas.
  const overlappingVacations = await Vacation.findAll({
    where: vacationWhereClause
  });


  // --- FIM DA NOVA ESTRATÉGIA ---

  const dailyCount = {};
  for (const vac of overlappingVacations) {
    let currentDate = new Date(vac.data_inicio);
    const lastDate = new Date(vac.data_fim);
    while (currentDate <= lastDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      dailyCount[dateKey] = (dailyCount[dateKey] || 0) + 1;
      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }
  }

  let currentRequestDate = new Date(startDate);
  const lastRequestDate = new Date(endDate);
  
  while (currentRequestDate <= lastRequestDate) {
    const dateKey = currentRequestDate.toISOString().split('T')[0];
    const countOnThisDay = dailyCount[dateKey] || 0;

    if (countOnThisDay + 1 > maxGroupLimit) {
      const formattedDate = formatDateToBR(currentRequestDate);

      const conflictingVacations = overlappingVacations.filter(vac => {
          const vacStart = new Date(vac.data_inicio);
          const vacEnd = new Date(vac.data_fim);
          return currentRequestDate >= vacStart && currentRequestDate <= vacEnd;
      });

      const userStrings = conflictingVacations.map(vac => {
        const userName = userMap.get(vac.matricula) || `Matrícula ${vac.matricula}`;
        return `${userName} (férias de ${formatDateToBR(vac.data_inicio)} a ${formatDateToBR(vac.data_fim)})`;
      });
      
      const detailedMessage = `As vagas já estão ocupadas por: ${userStrings.join('; ')}.`;

      return {
        allowed: false,
        message: `Limite de ${maxGroupLimit} vagas para o grupo ${userGroupName} foi atingido no dia ${formattedDate}. ${detailedMessage}`
      };
    }
    
    currentRequestDate.setUTCDate(currentRequestDate.getUTCDate() + 1);
  }

  return {
    allowed: true,
    message: 'Limite de vagas respeitado.'
  };
}

module.exports = { checkVacationLimits };