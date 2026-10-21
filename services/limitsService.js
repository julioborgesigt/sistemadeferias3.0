const { Op } = require('sequelize');
const { Vacation, User, Settings } = require('../models');

const CARGOS = ['IPC', 'EPC', 'DPC'];
const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
];

function cargoFromCategoria(categoria) {
  const value = String(categoria || '');
  if (value.startsWith('IPC')) return 'IPC';
  if (value.startsWith('EPC')) return 'EPC';
  if (value.startsWith('DPC')) return 'DPC';
  return null;
}

function categoriasDoCargo(cargo) {
  return [cargo, `${cargo}-P`];
}

function floorPercent(percent, total) {
  const pct = Number(percent);
  const amount = Number(total);
  if (!Number.isFinite(pct) || !Number.isFinite(amount) || pct <= 0 || amount <= 0) return 0;
  return Math.floor((pct * amount) / 100);
}

function utcDateOnly(value) {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function brazilToday(refDate = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(refDate);
  const read = (type) => Number(parts.find((part) => part.type === type).value);
  const year = read('year');
  const month = read('month');
  const day = read('day');
  return {
    year,
    month,
    day,
    date: new Date(Date.UTC(year, month - 1, day)),
    monthLabel: `${MESES[month - 1]} de ${year}`
  };
}

function countBusinessDays(start, end) {
  if (!start || !end || start > end) return 0;
  let count = 0;
  const cursor = new Date(start.getTime());
  while (cursor <= end) {
    const weekday = cursor.getUTCDay();
    if (weekday !== 0 && weekday !== 6) count += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

function readNumber(settings, key, fallback) {
  if (!settings) return fallback;
  const value = settings[key];
  if (value === null || value === undefined || value === '') return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function ruleForCargo(settings, cargo, efetivo) {
  const suffix = cargo.toLowerCase();
  const pctPrimeiro = readNumber(settings, `pct_primeiro_${suffix}`, 15);
  const rawMax = settings ? settings[`max_seguintes_${suffix}`] : null;
  const maxInformado = rawMax === null || rawMax === undefined || rawMax === '' ? null : Number(rawMax);
  const sugestao20 = floorPercent(20, efetivo);
  const maxSeguintes = maxInformado === null || !Number.isFinite(maxInformado) ? sugestao20 : maxInformado;
  return {
    cargo,
    efetivo,
    pctPrimeiro,
    limiteInicios: floorPercent(pctPrimeiro, efetivo),
    maxSeguintes,
    maxSeguintesInformado: Number.isFinite(maxInformado) ? maxInformado : null,
    sugestao20,
    toleranciaDias: readNumber(settings, `tolerancia_dias_${suffix}`, 0)
  };
}

function countEfetivo(pessoas) {
  const totals = { IPC: 0, EPC: 0, DPC: 0 };
  for (const pessoa of pessoas) {
    const cargo = cargoFromCategoria(pessoa.categoria);
    if (cargo) totals[cargo] += 1;
  }
  return totals;
}

function businessOverlapDays(inicio, fim, periodos) {
  const days = new Set();
  for (const periodo of periodos) {
    const start = inicio > periodo.inicio ? inicio : periodo.inicio;
    const end = fim < periodo.fim ? fim : periodo.fim;
    if (!start || !end || start > end) continue;
    const cursor = new Date(start.getTime());
    while (cursor <= end) {
      const weekday = cursor.getUTCDay();
      if (weekday !== 0 && weekday !== 6) days.add(cursor.toISOString().slice(0, 10));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }
  return days.size;
}

function quantidade(amount, singular, plural) {
  return `${amount} ${Number(amount) === 1 ? singular : plural}`;
}

function listarNomes(matriculas, ferias) {
  return matriculas.map((matricula) => {
    const item = ferias.find((feriasItem) => String(feriasItem.matricula) === String(matricula));
    return item && item.nome ? item.nome : matricula;
  });
}

function evaluatePeriodLimit({ regra, periodoNumero, inicio, fim, outrasFerias }) {
  const start = utcDateOnly(inicio);
  const end = utcDateOnly(fim);
  if (!start || !end) {
    return { allowed: false, message: 'Datas do período inválidas para a verificação de limites.' };
  }

  if (Number(periodoNumero) === 1) {
    const year = start.getUTCFullYear();
    const month = start.getUTCMonth();
    const matriculas = new Set();
    for (const ferias of outrasFerias) {
      if (Number(ferias.periodo) !== 1) continue;
      const existente = utcDateOnly(ferias.inicio);
      if (!existente) continue;
      if (existente.getUTCFullYear() === year && existente.getUTCMonth() === month) {
        matriculas.add(String(ferias.matricula));
      }
    }
    if (matriculas.size + 1 > regra.limiteInicios) {
      const nomes = listarNomes([...matriculas], outrasFerias);
      const ocupacao = nomes.length ? ` Já iniciam neste mês: ${nomes.join(', ')}.` : '';
      return {
        allowed: false,
        message: `O cargo ${regra.cargo} permite ${quantidade(regra.limiteInicios, 'início', 'inícios')} de 1º período ou período único em ${MESES[month]} de ${year} (${regra.pctPrimeiro}% de ${quantidade(regra.efetivo, 'servidor', 'servidores')}, arredondado para baixo).${ocupacao}`
      };
    }
    return { allowed: true };
  }

  const porServidor = new Map();
  for (const ferias of outrasFerias) {
    if (Number(ferias.periodo) < 2) continue;
    const inicioExistente = utcDateOnly(ferias.inicio);
    const fimExistente = utcDateOnly(ferias.fim);
    if (!inicioExistente || !fimExistente) continue;
    const matricula = String(ferias.matricula);
    if (!porServidor.has(matricula)) {
      porServidor.set(matricula, { nome: ferias.nome || matricula, periodos: [] });
    }
    porServidor.get(matricula).periodos.push({ inicio: inicioExistente, fim: fimExistente });
  }

  const conflitos = [];
  for (const info of porServidor.values()) {
    const dias = businessOverlapDays(start, end, info.periodos);
    if (dias > regra.toleranciaDias) conflitos.push({ nome: info.nome, dias });
  }

  if (conflitos.length + 1 > regra.maxSeguintes) {
    const origem = regra.maxSeguintesInformado === null
      ? `${quantidade(regra.maxSeguintes, 'servidor', 'servidores')}, correspondente a 20% de ${quantidade(regra.efetivo, 'servidor', 'servidores')}, arredondado para baixo`
      : quantidade(regra.maxSeguintes, 'servidor', 'servidores');
    const lista = conflitos.length
      ? ` O período informado ultrapassa o limite com: ${conflitos.map((item) => `${item.nome} (${quantidade(item.dias, 'dia útil', 'dias úteis')})`).join(', ')}.`
      : ' Não há vaga para mais um servidor em 2º ou 3º período.';
    return {
      allowed: false,
      message: `O cargo ${regra.cargo} permite ${origem} em 2º ou 3º período ao mesmo tempo. Choques de até ${quantidade(regra.toleranciaDias, 'dia útil', 'dias úteis')} são ignorados.${lista}`
    };
  }

  return { allowed: true };
}

function summarizeLimits(users, settings, refDate = new Date()) {
  const hoje = brazilToday(refDate);
  const cargos = {};
  for (const cargo of CARGOS) {
    const doCargo = users.filter((user) => (
      Number(user.ano_referencia) === hoje.year && cargoFromCategoria(user.categoria) === cargo
    ));
    const regra = ruleForCargo(settings, cargo, doCargo.length);
    const inicios = new Set();
    const seguintesHoje = new Set();
    for (const user of doCargo) {
      for (const ferias of user.Vacations || []) {
        const inicio = utcDateOnly(ferias.data_inicio);
        const fim = utcDateOnly(ferias.data_fim);
        if (Number(ferias.periodo) === 1 && inicio && inicio.getUTCFullYear() === hoje.year && inicio.getUTCMonth() === hoje.month - 1) {
          inicios.add(user.matricula);
        }
        if (Number(ferias.periodo) >= 2 && inicio && fim && inicio <= hoje.date && fim >= hoje.date) {
          seguintesHoje.add(user.matricula);
        }
      }
    }
    cargos[cargo] = {
      ...regra,
      iniciosNoMes: inicios.size,
      emSeguintesHoje: seguintesHoje.size
    };
  }
  return { year: hoje.year, monthLabel: hoje.monthLabel, cargos };
}

function parseBounded(value, min, max) {
  const number = Number(String(value).trim());
  if (!Number.isInteger(number) || number < min || number > max) return null;
  return number;
}

function buildLimitPayload(body) {
  const payload = {};
  for (const cargo of ['ipc', 'epc', 'dpc']) {
    const percent = parseBounded(body[`pct_primeiro_${cargo}`], 0, 100);
    if (percent === null) {
      throw new Error('A porcentagem de inícios do 1º período deve ser um inteiro entre 0 e 100.');
    }
    payload[`pct_primeiro_${cargo}`] = percent;

    const rawMax = body[`max_seguintes_${cargo}`];
    if (rawMax === undefined || rawMax === null || String(rawMax).trim() === '') {
      payload[`max_seguintes_${cargo}`] = null;
    } else {
      const max = parseBounded(rawMax, 0, 10000);
      if (max === null) {
        throw new Error('O limite de servidores em 2º ou 3º período deve ser um inteiro a partir de zero, ou ficar em branco para usar 20% do efetivo.');
      }
      payload[`max_seguintes_${cargo}`] = max;
    }

    const tolerance = parseBounded(body[`tolerancia_dias_${cargo}`], 0, 366);
    if (tolerance === null) {
      throw new Error('A tolerância de choque deve ser um inteiro entre 0 e 366 dias úteis.');
    }
    payload[`tolerancia_dias_${cargo}`] = tolerance;
  }
  return payload;
}

async function checkVacationPeriods({ user, periods, ano_referencia, matriculaToExclude = null }) {
  const cargo = cargoFromCategoria(user.categoria);
  if (!cargo) return ['A categoria informada não pertence a um cargo com limite configurável.'];

  const settings = await Settings.findOne({ where: { id: 1 } });
  const pessoas = await User.findAll({
    attributes: ['matricula', 'nome'],
    where: {
      ano_referencia: Number(ano_referencia),
      categoria: { [Op.in]: categoriasDoCargo(cargo) }
    },
    raw: true
  });
  const nomes = new Map(pessoas.map((pessoa) => [String(pessoa.matricula), pessoa.nome]));
  const matriculas = [...nomes.keys()];
  const ferias = matriculas.length
    ? await Vacation.findAll({
      where: { ano_referencia: Number(ano_referencia), matricula: { [Op.in]: matriculas } },
      raw: true
    })
    : [];
  const excluir = matriculaToExclude === null || matriculaToExclude === undefined ? null : String(matriculaToExclude);
  const outrasFerias = ferias
    .filter((item) => String(item.matricula) !== excluir)
    .map((item) => ({
      matricula: String(item.matricula),
      nome: nomes.get(String(item.matricula)) || String(item.matricula),
      periodo: item.periodo,
      inicio: item.data_inicio,
      fim: item.data_fim
    }));
  const regra = ruleForCargo(settings, cargo, new Set(matriculas).size);
  const errors = [];
  periods.forEach((period, index) => {
    const result = evaluatePeriodLimit({
      regra,
      periodoNumero: index + 1,
      inicio: period.inicio,
      fim: period.fim,
      outrasFerias
    });
    if (!result.allowed) errors.push(result.message);
  });
  return errors;
}

module.exports = {
  CARGOS,
  buildLimitPayload,
  businessOverlapDays,
  cargoFromCategoria,
  checkVacationPeriods,
  countBusinessDays,
  brazilToday,
  countEfetivo,
  evaluatePeriodLimit,
  floorPercent,
  ruleForCargo,
  summarizeLimits,
  utcDateOnly
};
