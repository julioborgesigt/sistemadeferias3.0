// controllers/userController.js
const { User, Vacation, Settings } = require('../models');
const { formatDateToBR, formatDateToISO } = require('../utils/dateUtils'); // <--- AQUI ESTÁ A LINHA CRÍTICA que importa a função

const userService = require('../services/userService');
const migrationService = require('../services/migrationService');
const db = require('../models');

async function dashboard(req, res) {
  try {
    const users = await User.findAll({
      include: [{ model: Vacation, required: false }],
      order: [['classificacao', 'ASC']],
    });
    users.forEach(user => {
      if (user.Vacations) {
        user.Vacations = user.Vacations.filter(vac => vac.ano_referencia === user.ano_referencia);
      }
    });
    const settings = await Settings.findOne({ where: { id: 1 } }) || {};
    const distinctYearsRaw = await User.findAll({
      attributes: [[db.sequelize.fn('DISTINCT', db.sequelize.col('ano_referencia')), 'ano_referencia']],
      order: [['ano_referencia', 'DESC']],
      raw: true
    });
    const distinctYears = distinctYearsRaw.map(item => item.ano_referencia);
    res.render('admin_dashboard', {
      admin: req.session.admin,
      users,
      settings,
      distinctYears,
      formatDate: formatDateToBR,
      formatDateISO: formatDateToISO,
    });
  } catch (error) {
    console.error('Erro ao carregar o dashboard:', error);
    req.flash('error_msg', 'Erro ao carregar os dados do dashboard.');
    res.redirect('/auth/login');
  }
}

async function showRegistrationForm(req, res) {
    try {
        const distinctDates = await User.findAll({
            attributes: [[db.sequelize.fn('DISTINCT', db.sequelize.col('data_ingresso')), 'data_ingresso']],
            raw: true
        });
        res.render('user_registration', { distinctDates, old: req.body || {} });
    } catch (error) {
        console.error("Erro ao carregar formulário de registro:", error);
        req.flash('error_msg', 'Erro ao carregar o formulário.');
        res.redirect('/users/dashboard');
    }
}

async function registerUser(req, res) {
  try {
    await userService.createUser(req.body);
    req.flash('success_msg', 'Usuário cadastrado com sucesso!');
    res.render('user_registration_confirmation', { success_msg: req.flash('success_msg') });
  } catch (error) {
    console.error('Erro ao registrar usuário:', error);
    req.flash('error_msg', error.message);
    const distinctDates = await User.findAll({
        attributes: [[db.sequelize.fn('DISTINCT', db.sequelize.col('data_ingresso')), 'data_ingresso']],
        raw: true
    });
    res.render('user_registration', {
        distinctDates,
        old: req.body,
        error_msg: req.flash('error_msg'),
    });
  }
}

async function editUserForm(req, res) {
    try {
        const { matricula, ano } = req.params;
        const user = await User.findOne({ where: { matricula, ano_referencia: ano } });
        if (!user) {
            return res.status(404).send('Usuário não encontrado');
        }

        // CRIA UM NOVO OBJETO COM AS DATAS JÁ FORMATADAS
        const userParaView = {
            ...user.toJSON(),
            data_nascimento_iso: formatDateToISO(user.data_nascimento),
            data_ingresso_iso: formatDateToISO(user.data_ingresso)
        };

        // Envia o novo objeto para a view, sem precisar enviar a função
        res.render('user_edit_form', { user: userParaView });

    } catch (error) {
        console.error("ERRO DETALHADO em editUserForm:", error);
        res.status(500).send('Erro interno ao carregar o formulário de usuário.');
    }
}

async function updateUser(req, res) {
    try {
        const { matricula, ano } = req.params;
        await userService.updateUser(matricula, ano, req.body);
        req.flash('success_msg', 'Usuário atualizado com sucesso!');
    } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        req.flash('error_msg', error.message);
    }
    res.redirect('/users/dashboard');
}

// ===================================================================
// NOVA FUNÇÃO: Busca e retorna os anos de referência de um usuário
// ===================================================================
async function getUserYears(req, res) {
    try {
        const { matricula } = req.params;
        const userYears = await User.findAll({
            attributes: [[db.sequelize.fn('DISTINCT', db.sequelize.col('ano_referencia')), 'ano_referencia']],
            where: { matricula },
            order: [['ano_referencia', 'DESC']],
            raw: true
        });
        const years = userYears.map(u => u.ano_referencia);
        res.json({ success: true, years });
    } catch (error) {
        console.error('Erro ao buscar anos do usuário:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar dados.' });
    }
}


// ===================================================================
// FUNÇÕES ATUALIZADAS: Para aceitar múltiplos anos
// ===================================================================
async function deleteUser(req, res) {
  try {
    const { matricula, anos_referencia } = req.body;
    
    // Converte para array se for um único valor
    const yearsToDelete = Array.isArray(anos_referencia) ? anos_referencia : [anos_referencia];

    if (!matricula || !yearsToDelete || yearsToDelete.length === 0) {
        req.flash('error_msg', 'Matrícula ou anos de referência inválidos.');
        return res.redirect('/users/dashboard');
    }

    const deletedCount = await userService.deleteUser(matricula, yearsToDelete);

    if (deletedCount > 0) {
      req.flash('success_msg', `Registros para a matrícula ${matricula} nos anos [${yearsToDelete.join(', ')}] foram apagados.`);
    } else {
      req.flash('error_msg', `Nenhum registro encontrado para a matrícula ${matricula} nos anos selecionados.`);
    }
  } catch (error) {
    console.error('Erro ao apagar matrícula:', error);
    req.flash('error_msg', 'Erro ao apagar matrícula.');
  }
  res.redirect('/users/dashboard');
}

async function resetVacations(req, res) {
  try {
    const { matricula, anos_referencia } = req.body;
    
    const yearsToReset = Array.isArray(anos_referencia) ? anos_referencia : [anos_referencia];

    if (!matricula || !yearsToReset || yearsToReset.length === 0) {
        req.flash('error_msg', 'Matrícula ou anos de referência inválidos.');
        return res.redirect('/users/dashboard');
    }

    const deletedCount = await userService.resetUserVacations(matricula, yearsToReset);
    req.flash('success_msg', `${deletedCount} registro(s) de férias para a matrícula ${matricula} nos anos [${yearsToReset.join(', ')}] foram removidos.`);
  } catch (error) {
    console.error("Erro ao resetar férias:", error);
    req.flash('error_msg', 'Erro ao resetar férias.');
  }
  res.redirect('/users/dashboard');
}


async function migrateUsers(req, res) {
  try {
    const { sourceYear, targetYear } = req.body;
    if (sourceYear === targetYear) {
      req.flash('error_msg', 'O ano de origem e o de destino não podem ser iguais.');
      return res.redirect('/users/dashboard');
    }
    const count = await migrationService.migrateData(Number(sourceYear), Number(targetYear));
    req.flash('success_msg', `${count} usuários migrados de ${sourceYear} para ${targetYear} com sucesso.`);
  } catch (error) {
    console.error("Erro na migração:", error);
    req.flash('error_msg', error.message);
  }
  res.redirect('/users/dashboard');
}

async function updateLimits(req, res) {
  try {
    const settings = await Settings.findOne({ where: { id: 1 } });
    if (settings) {
      await settings.update(req.body);
    } else {
      await Settings.create(req.body);
    }
    req.flash('success_msg', 'Limites atualizados com sucesso!');
  } catch (error) {
    console.error('Erro ao atualizar limites:', error);
    req.flash('error_msg', 'Erro ao atualizar os limites.');
  }
  res.redirect('/users/dashboard');
}

async function showClassification(req, res) {
  try {
    // 1. Determina o ano a ser exibido: pega da URL ou usa o ano corrente como padrão.
    const selectedYear = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();

    // 2. Busca todos os anos de referência distintos que existem no banco para preencher o filtro.
    const distinctYearsRaw = await User.findAll({
        attributes: [[db.sequelize.fn('DISTINCT', db.sequelize.col('ano_referencia')), 'ano_referencia']],
        order: [['ano_referencia', 'DESC']],
        raw: true
    });
    const distinctYears = distinctYearsRaw.map(item => item.ano_referencia);

    // 3. Busca os usuários, mas agora com um filtro 'where' para o ano selecionado.
    const users = await User.findAll({
      where: { ano_referencia: selectedYear },
      include: [{ model: Vacation, required: false }],
      order: [['classificacao', 'ASC']]
    });

    // Filtra os usuários encontrados por categoria
    const ipcUsers = users.filter(u => ['IPC', 'IPC-P'].includes(u.categoria));
    const epcUsers = users.filter(u => ['EPC', 'EPC-P'].includes(u.categoria));
    const dpcUsers = users.filter(u => ['DPC', 'DPC-P'].includes(u.categoria));

    // 4. Renderiza a página, enviando os dados filtrados e as informações para o seletor de ano.
    res.render('classification', {
      ipcUsers,
      epcUsers,
      dpcUsers,
      formatDate: formatDateToBR,
      distinctYears,  // Lista de anos para o dropdown
      selectedYear    // Ano que está selecionado no momento
    });
  } catch (error) {
    console.error('Erro ao carregar a classificação:', error);
    req.flash('error_msg', 'Erro ao carregar a página de classificação.');
    res.redirect('/');
  }
}

module.exports = {
  dashboard, showRegistrationForm, registerUser, editUserForm, updateUser, deleteUser, resetVacations, migrateUsers, updateLimits, showClassification, getUserYears
};