// services/vacationValidationService.js
const { isWeekend, diffInDays, formatDateToBR, parseDateToUTC } = require('../utils/dateUtils');
const { checkVacationLimits } = require('./limitsService');

/**
 * Valida um conjunto de períodos de férias contra todas as regras de negócio.
 *
 * @param {object} params - Os parâmetros para validação.
 * @param {object} params.user - O objeto do usuário do Sequelize.
 * @param {Array<object>} params.periods - Array de objetos de período, cada um com { inicio: Date, fim: Date }.
 * @param {string} params.qtd_periodos_str - A string que define a quantidade e duração dos períodos (ex: '1', '2_10_20', '3').
 * @param {number} params.ano_referencia - O ano de referência das férias.
 * @returns {Promise<{isValid: boolean, errors: string[]}>} - Um objeto indicando se os períodos são válidos e uma lista de erros.
 */
async function validatePeriods({ user, periods, qtd_periodos_str, ano_referencia, isEditOperation = false }) {
  const errors = [];

  // <-- NOVA VERIFICAÇÃO: Garante que os períodos não se sobreponham entre si
  if (periods.length > 1) {
    // Ordena os períodos por data de início para uma verificação segura
    const sortedPeriods = [...periods].sort((a, b) => a.inicio - b.inicio);
    for (let i = 1; i < sortedPeriods.length; i++) {
      const previousPeriodEnd = sortedPeriods[i - 1].fim;
      const currentPeriodStart = sortedPeriods[i].inicio;
      if (currentPeriodStart <= previousPeriodEnd) {
        errors.push(`O início do período ${i + 1} (${formatDateToBR(currentPeriodStart)}) não pode ser anterior ou no mesmo dia do fim do período ${i} (${formatDateToBR(previousPeriodEnd)}).`);
      }
    }
  }

  // === Validações de Quantidade e Duração ===
  const durations = periods.map(p => diffInDays(p.inicio, p.fim));
  const [numPeriods, dur1, dur2] = qtd_periodos_str.split('_').map(Number);

  if (periods.length !== numPeriods) {
    errors.push('A quantidade de períodos informados não corresponde à opção selecionada.');
  } else {
    if (qtd_periodos_str === '1' && durations[0] !== 30) {
      errors.push('Para 1 período, as férias devem ter exatamente 30 dias.');
    } else if (numPeriods === 2) {
        const expectedDurations = `${dur1}+${dur2}`;
        const actualDurations = `${durations[0]}+${durations[1]}`;
        if (expectedDurations !== actualDurations) {
            errors.push(`Para 2 períodos, a combinação de dias deve ser ${expectedDurations}, mas foi ${actualDurations}.`);
        }
    } else if (qtd_periodos_str === '3' && !durations.every(d => d === 10)) {
      errors.push('Para 3 períodos, cada um deve ter exatamente 10 dias.');
    }
  }

  // === Validações por Período Individual ===
  for (const period of periods) {
    if (isWeekend(period.inicio)) {
      errors.push(`A data de início ${formatDateToBR(period.inicio)} não pode ser em um fim de semana.`);
    }

    const aquisitivoFim = new Date(user.periodo_aquisitivo_fim);
    if (period.inicio < aquisitivoFim) {
      errors.push(`A data de início deve ser após o fim do período aquisitivo: ${formatDateToBR(aquisitivoFim)}.`);
    }

    const maxDate = new Date(aquisitivoFim);
    maxDate.setUTCFullYear(maxDate.getUTCFullYear() + 1);
    maxDate.setUTCDate(maxDate.getUTCDate() + 2);
    if (period.fim > maxDate) {
      errors.push(`A data final excede o limite do período concessivo de ${formatDateToBR(maxDate)}.`);
    }

    // Passa a matrícula do usuário para ser excluída da contagem, SE for uma operação de edição
    const matriculaToExclude = isEditOperation ? user.matricula : null;
    const limitCheck = await checkVacationLimits(user.categoria, period.inicio, period.fim, ano_referencia, matriculaToExclude);
    if (!limitCheck.allowed) {
      errors.push(limitCheck.message);
    }
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

module.exports = { validatePeriods };