const { Op } = require('sequelize');
const { User, Vacation, Cobertura } = require('../models');
const { businessOverlapDays, utcDateOnly, ruleForCargo, cargoFromCategoria } = require('./limitsService');
const { formatDateToBR } = require('../utils/dateUtils');

const LOTACOES = [
  'Seccional',
  'Iguatu',
  'Jucás',
  'Saboeiro',
  'Acopiara',
  'Várzea Alegre',
  'Icó',
  'Orós',
  'Lavras da Mangabeira',
  'Ipaumirim',
  'Cedro'
];

const PARES_PADRAO = [
  ['Iguatu', 'Acopiara'],
  ['Jucás', 'Saboeiro'],
  ['Várzea Alegre', 'Cedro'],
  ['Icó', 'Orós'],
  ['Lavras da Mangabeira', 'Ipaumirim']
];

function chaveLotacao(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function normalizarLotacao(valor) {
  const chave = chaveLotacao(valor);
  return LOTACOES.find((nome) => chaveLotacao(nome) === chave) || null;
}

function ordenarPar(origem, destino) {
  const a = normalizarLotacao(origem);
  const b = normalizarLotacao(destino);
  if (!a || !b) throw new Error('Escolha duas lotações da lista.');
  if (a === b) throw new Error('Uma lotação não cobre a si mesma.');
  return a.localeCompare(b, 'pt') <= 0 ? [a, b] : [b, a];
}

async function listarPares() {
  const pares = await Cobertura.findAll({ order: [['lotacao_a', 'ASC'], ['lotacao_b', 'ASC']] });
  return pares.map((par) => ({ id: par.id, lotacao_a: par.lotacao_a, lotacao_b: par.lotacao_b }));
}

async function garantirParesPadrao() {
  const total = await Cobertura.count();
  if (total > 0) return;
  for (const [origem, destino] of PARES_PADRAO) {
    const [lotacao_a, lotacao_b] = ordenarPar(origem, destino);
    await Cobertura.create({ lotacao_a, lotacao_b });
  }
}

async function adicionarPar(origem, destino) {
  const [lotacao_a, lotacao_b] = ordenarPar(origem, destino);
  const existente = await Cobertura.findOne({ where: { lotacao_a, lotacao_b } });
  if (existente) throw new Error(`${lotacao_a} e ${lotacao_b} já estão configuradas como cobertura recíproca.`);
  return Cobertura.create({ lotacao_a, lotacao_b });
}

async function removerPar(id) {
  const apagados = await Cobertura.destroy({ where: { id } });
  if (!apagados) throw new Error('Cobertura não encontrada.');
}

function parceirasDe(lotacao, pares) {
  const nome = normalizarLotacao(lotacao) || lotacao;
  const destino = new Set();
  for (const par of pares) {
    if (par.lotacao_a === nome) destino.add(par.lotacao_b);
    if (par.lotacao_b === nome) destino.add(par.lotacao_a);
  }
  return destino;
}

function ehDpc(categoria) {
  return cargoFromCategoria(categoria) === 'DPC';
}

function avaliarChoquesLotacao({ categoria, lotacao, periodos, pares, outrasPessoas, toleranciaDias }) {
  if (!ehDpc(categoria)) return [];
  const parceiras = parceirasDe(lotacao, pares);
  if (!parceiras.size) return [];
  const mensagens = [];
  for (const pessoa of outrasPessoas) {
    if (!ehDpc(pessoa.categoria)) continue;
    if (!parceiras.has(pessoa.lotacao)) continue;
    for (const periodoNovo of periodos) {
      const inicio = utcDateOnly(periodoNovo.inicio);
      const fim = utcDateOnly(periodoNovo.fim);
      if (!inicio || !fim) continue;
      for (const ferias of pessoa.ferias || []) {
        const inicioExistente = utcDateOnly(ferias.inicio);
        const fimExistente = utcDateOnly(ferias.fim);
        if (!inicioExistente || !fimExistente) continue;
        const dias = businessOverlapDays(inicio, fim, [{ inicio: inicioExistente, fim: fimExistente }]);
        if (dias > toleranciaDias) {
          mensagens.push(
            `DPCs de ${lotacao} e ${pessoa.lotacao} se cobrem nas férias. O período coincide com ${pessoa.nome} (DPC, ${pessoa.lotacao}), de ${formatDateToBR(inicioExistente)} a ${formatDateToBR(fimExistente)}, em ${dias} dia(s) útil(eis).`
          );
        }
      }
    }
  }
  return [...new Set(mensagens)];
}

async function choquesDoPedido({ user, periods, ano_referencia }) {
  if (!User.rawAttributes.lotacao || !ehDpc(user.categoria)) return [];
  const lotacao = normalizarLotacao(user.lotacao) || user.lotacao || 'Iguatu';
  const pares = await listarPares();
  const parceiras = [...parceirasDe(lotacao, pares)];
  if (!parceiras.length) return [];

  const pessoas = await User.findAll({
    where: {
      ano_referencia: Number(ano_referencia),
      lotacao: { [Op.in]: parceiras },
      categoria: { [Op.in]: ['DPC', 'DPC-P'] },
      matricula: { [Op.ne]: String(user.matricula) }
    },
    include: [{ model: Vacation, required: false }],
    raw: false
  });
  const cargo = cargoFromCategoria(user.categoria);
  const { Settings } = require('../models');
  const settings = await Settings.findOne({ where: { id: 1 } });
  const tolerancia = cargo ? ruleForCargo(settings, cargo, 0).toleranciaDias : 0;

  const outrasPessoas = pessoas.map((pessoa) => ({
    nome: pessoa.nome,
    categoria: pessoa.categoria,
    lotacao: pessoa.lotacao,
    ferias: (pessoa.Vacations || [])
      .filter((ferias) => Number(ferias.ano_referencia) === Number(ano_referencia))
      .map((ferias) => ({ inicio: ferias.data_inicio, fim: ferias.data_fim }))
  }));

  return avaliarChoquesLotacao({
    categoria: user.categoria,
    lotacao,
    periodos: periods,
    pares,
    outrasPessoas,
    toleranciaDias: tolerancia
  });
}

function diasUteisEntre(inicio, fim, outroInicio, outroFim) {
  const a = utcDateOnly(inicio);
  const b = utcDateOnly(fim);
  const c = utcDateOnly(outroInicio);
  const d = utcDateOnly(outroFim);
  if (!a || !b || !c || !d) return 0;
  return businessOverlapDays(a, b, [{ inicio: c, fim: d }]);
}

async function relatorio(ano) {
  const anoNumero = Number(ano);
  const pares = await listarPares();
  const usuarios = await User.findAll({
    where: { ano_referencia: anoNumero },
    include: [{ model: Vacation, required: false }],
    order: [['nome', 'ASC']]
  });

  const choques = [];
  const vistos = new Set();
  for (let i = 0; i < usuarios.length; i += 1) {
    for (let j = i + 1; j < usuarios.length; j += 1) {
      const primeiro = usuarios[i];
      const segundo = usuarios[j];
      if (!ehDpc(primeiro.categoria) || !ehDpc(segundo.categoria)) continue;
      const parceiras = parceirasDe(primeiro.lotacao, pares);
      if (!parceiras.has(segundo.lotacao)) continue;
      const feriasA = (primeiro.Vacations || []).filter((item) => Number(item.ano_referencia) === anoNumero);
      const feriasB = (segundo.Vacations || []).filter((item) => Number(item.ano_referencia) === anoNumero);
      for (const periodoA of feriasA) {
        for (const periodoB of feriasB) {
          const dias = diasUteisEntre(periodoA.data_inicio, periodoA.data_fim, periodoB.data_inicio, periodoB.data_fim);
          if (dias <= 0) continue;
          const chave = [primeiro.matricula, periodoA.id, segundo.matricula, periodoB.id].join(':');
          if (vistos.has(chave)) continue;
          vistos.add(chave);
          choques.push({
            servidorA: primeiro.nome,
            lotacaoA: primeiro.lotacao,
            periodoA: `${formatDateToBR(periodoA.data_inicio)} a ${formatDateToBR(periodoA.data_fim)}`,
            servidorB: segundo.nome,
            lotacaoB: segundo.lotacao,
            periodoB: `${formatDateToBR(periodoB.data_inicio)} a ${formatDateToBR(periodoB.data_fim)}`,
            diasUteis: dias,
            aprovado: Boolean(periodoA.aprovado_com_choque || periodoB.aprovado_com_choque)
          });
        }
      }
    }
  }

  const semFerias = usuarios
    .filter((usuario) => !(usuario.Vacations || []).some((item) => Number(item.ano_referencia) === anoNumero))
    .map((usuario) => ({
      nome: usuario.nome,
      matricula: usuario.matricula,
      lotacao: usuario.lotacao,
      categoria: usuario.categoria
    }));

  const aprovadas = [];
  for (const usuario of usuarios) {
    const marcadas = (usuario.Vacations || []).filter((item) => item.aprovado_com_choque && Number(item.ano_referencia) === anoNumero);
    if (!marcadas.length) continue;
    aprovadas.push({
      nome: usuario.nome,
      matricula: usuario.matricula,
      lotacao: usuario.lotacao,
      aviso: marcadas.map((item) => item.aviso_choque).filter(Boolean).join(' ')
    });
  }

  return { ano: anoNumero, pares, choques, semFerias, aprovadas };
}

module.exports = {
  LOTACOES,
  adicionarPar,
  avaliarChoquesLotacao,
  ehDpc,
  choquesDoPedido,
  garantirParesPadrao,
  listarPares,
  normalizarLotacao,
  ordenarPar,
  relatorio,
  removerPar
};
