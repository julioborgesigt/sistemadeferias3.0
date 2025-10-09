// services/userService.js (VERSÃO FINAL E LIMPA)

const { User, Vacation } = require('../models');
const { Op } = require('sequelize');
const classificationService = require('./classificationService');
const { diffInDays, parseDateToUTC } = require('../utils/dateUtils');

async function createUser(userData) {
  const { matricula, ano_referencia } = userData;
  const existingUser = await User.findOne({ where: { matricula, ano_referencia } });
  if (existingUser) {
    throw new Error('Usuário já cadastrado para este ano de referência.');
  }
  const preparedData = {
    ...userData,
    gestante: userData.gestante === 'on',
    estudante: userData.estudante === 'on',
    doisvinculos: userData.doisvinculos === 'on',
    possui_conjuge: userData.possui_conjuge === 'on',
    qtd_filhos: parseInt(userData.qtd_filhos) || 0,
  };
  if (preparedData.data_ingresso && preparedData.data_nascimento && preparedData.ano_referencia) {
    const referenceDate = new Date(preparedData.ano_referencia, 11, 31);
    const dataIngresso = parseDateToUTC(preparedData.data_ingresso);
    const dataNascimento = parseDateToUTC(preparedData.data_nascimento);
    preparedData.data_ingresso_dias = diffInDays(dataIngresso, referenceDate);
    preparedData.data_nascimento_dias = diffInDays(dataNascimento, referenceDate);
  } else {
    throw new Error('Dados essenciais (datas ou ano de referência) estão faltando para o cálculo.');
  }
  const newUser = await User.create(preparedData);
  await classificationService.updateUserClassification();
  return newUser;
}

async function updateUser(matricula, ano, updateData) {
    const user = await User.findOne({ where: { matricula, ano_referencia: ano } });
    if (!user) { throw new Error('Usuário não encontrado para atualização.'); }
    const preparedData = { ...updateData, gestante: updateData.gestante === 'on', estudante: updateData.estudante === 'on', doisvinculos: updateData.doisvinculos === 'on', possui_conjuge: updateData.possui_conjuge === 'on', qtd_filhos: parseInt(updateData.qtd_filhos) || 0, };
    const dataForCalc = { ...user.toJSON(), ...preparedData };
    if (dataForCalc.data_ingresso && dataForCalc.data_nascimento && dataForCalc.ano_referencia) {
        const referenceDate = new Date(dataForCalc.ano_referencia, 11, 31);
        const dataIngresso = parseDateToUTC(dataForCalc.data_ingresso);
        const dataNascimento = parseDateToUTC(dataForCalc.data_nascimento);
        preparedData.data_ingresso_dias = diffInDays(dataIngresso, referenceDate);
        preparedData.data_nascimento_dias = diffInDays(dataNascimento, referenceDate);
    }
    await user.update(preparedData);
    await classificationService.updateUserClassification();
    return user;
}

async function deleteUser(matricula, anos_referencia) {
  // Garante que 'anos_referencia' seja sempre um array
  const years = Array.isArray(anos_referencia) ? anos_referencia : [anos_referencia];
  
  // Usa o operador [Op.in] para apagar registros de múltiplos anos de uma vez
  await Vacation.destroy({ where: { matricula, ano_referencia: { [Op.in]: years } } });
  const deletedCount = await User.destroy({ where: { matricula, ano_referencia: { [Op.in]: years } } });

  if (deletedCount > 0) {
    await classificationService.updateUserClassification();
  }
  return deletedCount;
}

async function resetUserVacations(matricula, anos_referencia) {
  const years = Array.isArray(anos_referencia) ? anos_referencia : [anos_referencia];
  
  const deletedCount = await Vacation.destroy({ where: { matricula, ano_referencia: { [Op.in]: years } } });
  return deletedCount;
}

module.exports = {
  createUser, updateUser, deleteUser, resetUserVacations,
};