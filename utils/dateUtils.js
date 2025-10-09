// utils/dateUtils.js

/**
 * Converte uma string de data (ex: '2025-10-08') em um objeto Date,
 * tratando-a como UTC para evitar problemas de fuso horário.
 * O input <input type="date"> retorna a data neste formato, sem timezone.
 * Esta função garante que "2025-10-08" se torne `Date('2025-10-08T00:00:00.000Z')`.
 * @param {string} dateString - A data no formato 'YYYY-MM-DD'.
 * @returns {Date} O objeto Date correspondente.
 */
function parseDateToUTC(dateString) {
  if (!dateString) return null;
  return new Date(dateString + 'T00:00:00Z');
}

/**
 * Formata um objeto Date para o padrão brasileiro 'DD/MM/YYYY'.
 * Essencial para exibição de datas nas views.
 * @param {Date} date - O objeto Date a ser formatado.
 * @returns {string} A data formatada.
 */
function formatDateToBR(date) {
  if (!date) return '';
  const d = new Date(date);
  // Usamos getUTC* para ler a data como se estivesse em UTC, revertendo o efeito do parseDateToUTC.
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Formata um objeto Date para o padrão ISO 'YYYY-MM-DD'.
 * Essencial para preencher o valor de campos <input type="date">.
 * @param {Date} date - O objeto Date a ser formatado.
 * @returns {string} A data formatada.
 */
function formatDateToISO(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

/**
 * Calcula a diferença em dias entre duas datas (contagem inclusiva).
 * Ex: diffInDays('2025-10-08', '2025-10-08') retorna 1.
 * @param {Date} date1 - A data de início.
 * @param {Date} date2 - A data de fim.
 * @returns {number} O número de dias.
 */
function diffInDays(date1, date2) {
  const ONE_DAY_MS = 1000 * 60 * 60 * 24;
  const diffTime = Math.abs(date2 - date1);
  return Math.round(diffTime / ONE_DAY_MS) + 1;
}

/**
 * Verifica se uma data é sábado (6) ou domingo (0).
 * @param {Date} date - O objeto Date a ser verificado.
 * @returns {boolean} Verdadeiro se for um fim de semana.
 */
function isWeekend(date) {
  const day = new Date(date).getUTCDay();
  return day === 0 || day === 6;
}

module.exports = {
  parseDateToUTC,
  formatDateToBR,
  formatDateToISO,
  diffInDays,
  isWeekend
};