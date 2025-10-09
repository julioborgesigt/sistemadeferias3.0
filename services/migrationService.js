// services/migrationService.js
const { User } = require('../models');
const { Op } = require('sequelize');

/**
 * Migra os dados dos usuários de um ano de origem para um ano de destino.
 * Se um usuário já existir no ano de destino, seus dados são atualizados.
 * Caso contrário, um novo registro é criado.
 * @param {number} sourceYear - O ano do qual os dados serão copiados.
 * @param {number} targetYear - O ano para o qual os dados serão criados/atualizados.
 */
async function migrateData(sourceYear, targetYear) {
  // 1. Encontra todos os usuários do ano de origem
  const usersToMigrate = await User.findAll({
    where: { ano_referencia: sourceYear }
  });

  if (usersToMigrate.length === 0) {
    throw new Error(`Nenhum usuário encontrado para o ano de origem: ${sourceYear}`);
  }

  // 2. Itera sobre cada usuário para migrá-lo
  for (const user of usersToMigrate) {
    // 3. Prepara os novos dados. Os campos calculados (como data_ingresso_dias)
    // serão gerados automaticamente pelo hook 'beforeValidate' no model User.
    const newUserDefaults = {
      ...user.toJSON(),
      id: undefined, // Remove o ID para permitir a criação de um novo registro
      ano_referencia: targetYear,
      // Recalcula o início e fim do período aquisitivo para o novo ano
      periodo_aquisitivo_inicio: new Date(user.data_ingresso.getFullYear(), new Date(user.data_ingresso).getMonth(), new Date(user.data_ingresso).getDate()),
      periodo_aquisitivo_fim: new Date(new Date(user.data_ingresso).setFullYear(new Date(user.data_ingresso).getFullYear() + 1) - 1),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Define um novo início e fim para o período aquisitivo baseado no ano de destino
    const newAquisitivoInicio = new Date(user.data_ingresso);
    newAquisitivoInicio.setFullYear(targetYear);
    
    const newAquisitivoFim = new Date(newAquisitivoInicio);
    newAquisitivoFim.setFullYear(newAquisitivoFim.getFullYear() + 1);
    newAquisitivoFim.setDate(newAquisitivoFim.getDate() - 1);

    newUserDefaults.periodo_aquisitivo_inicio = newAquisitivoInicio;
    newUserDefaults.periodo_aquisitivo_fim = newAquisitivoFim;


    // 4. Usa findOrCreate para evitar duplicatas. Se o usuário já existir no ano de destino, ele não será criado.
    // Infelizmente, o 'updateOnDuplicate' não funciona como esperado com chaves compostas no sequelize v6 sem truques.
    // A abordagem manual (find, then create/update) é mais segura.
    
    const existingUser = await User.findOne({
      where: {
        matricula: user.matricula,
        ano_referencia: targetYear
      }
    });

    if (existingUser) {
      // Se já existe, atualiza os dados
      await existingUser.update(newUserDefaults);
    } else {
      // Se não existe, cria um novo
      await User.create(newUserDefaults);
    }
  }
  
  return usersToMigrate.length;
}

module.exports = { migrateData };