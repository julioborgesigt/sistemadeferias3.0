// controllers/vacationController.js
const { User, Vacation } = require('../models');
const { Op } = require('sequelize');
const db = require('../models');
const { parseDateToUTC, formatDateToISO, formatDateToBR } = require('../utils/dateUtils');
const validationService = require('../services/vacationValidationService');

async function showAdminVacationForm(req, res) {
  try {
    const users = await User.findAll({
      include: [{
        model: Vacation,
        required: false,
        where: { ano_referencia: { [Op.eq]: db.sequelize.col('User.ano_referencia') } }
      }],
      where: db.sequelize.literal('`Vacations`.`id` IS NULL'),
      order: [['nome', 'ASC']]
    });
    res.render('admin_vacation_form', { users, old: {} });
  } catch (error) {
    console.error('Erro ao carregar formulário de férias do admin:', error);
    req.flash('error_msg', 'Erro ao carregar a lista de usuários.');
    res.redirect('/users/dashboard');
  }
}

async function adminMarkVacation(req, res) {
  const { matricula, ano_referencia, qtd_periodos: qtd_periodos_str } = req.body;
  try {
    const user = await User.findOne({ where: { matricula, ano_referencia } });
    if (!user) {
      req.flash('error_msg', 'Usuário não encontrado para o ano de referência informado.');
      return res.redirect('/vacations/admin-form');
    }

    const periods = [];
    const numPeriods = parseInt(qtd_periodos_str.split('_')[0]);
    for (let i = 1; i <= numPeriods; i++) {
      if (req.body[`periodo${i}_inicio`] && req.body[`periodo${i}_fim`]) {
        periods.push({
          inicio: parseDateToUTC(req.body[`periodo${i}_inicio`]),
          fim: parseDateToUTC(req.body[`periodo${i}_fim`])
        });
      }
    }

    const validationResult = await validationService.validatePeriods({
      user, periods, qtd_periodos_str, ano_referencia
    });

    // ===== MUDANÇA IMPORTANTE AQUI =====
    // Se a validação falhar, usamos a mensagem detalhada do resultado.
    if (!validationResult.isValid) {
      // Usamos .join('<br>') para exibir a lista de erros de forma legível no toast.
      req.flash('error_msg', validationResult.errors.join('<br>'));
      
      const users = await User.findAll({ where: { /* lógica para buscar usuários pendentes */ } });
      return res.render('admin_vacation_form', {
        users,
        old: req.body,
        error_msg: req.flash('error_msg')
      });
    }

    // Se a validação passou, cria os registros.
    for (let i = 0; i < periods.length; i++) {
      await Vacation.create({
        matricula, periodo: i + 1, data_inicio: periods[i].inicio, data_fim: periods[i].fim, ano_referencia,
      });
    }

    req.flash('success_msg', `Férias para ${user.nome} cadastradas com sucesso!`);
    res.render('admin_vacation_confirmation', { success_msg: req.flash('success_msg') });

  } catch (error) {
    // Este 'catch' agora lida com erros inesperados, não erros de validação.
    console.error('Erro ao marcar férias (admin):', error);
    req.flash('error_msg', 'Ocorreu um erro inesperado ao processar a solicitação.');
    res.redirect('/vacations/admin-form');
  }
}

async function editVacationForm(req, res) {
    try {
        const { matricula, ano } = req.params;
        const user = await User.findOne({ where: { matricula, ano_referencia: ano } });
        const ferias = await Vacation.findAll({ where: { matricula, ano_referencia: ano }, order: [['periodo', 'ASC']] });

        if (!user) { // Não precisa de 'ferias.length' aqui, pois podemos querer adicionar férias onde não havia
            return res.status(404).send('Usuário não encontrado.');
        }

        // Prepara os dados de férias para a view
        const feriasParaView = ferias.map(vac => ({
            ...vac.toJSON(),
            data_inicio_iso: formatDateToISO(vac.data_inicio),
            data_fim_iso: formatDateToISO(vac.data_fim)
        }));

        res.render('vacation_edit_form', { user, ferias: feriasParaView });
    } catch (error) {
        console.error("ERRO DETALHADO em editVacationForm:", error);
        res.status(500).send('Erro interno ao carregar o formulário de férias.');
    }
}

/**
 * Processa a ATUALIZAÇÃO das férias, com validação completa.
 * Responde com JSON para ser consumido pelo JavaScript do modal.
 */
async function updateVacation(req, res) {
    const { matricula, ano } = req.params;
    const { qtd_periodos: qtd_periodos_str } = req.body;
    const t = await db.sequelize.transaction();

    try {
        const user = await User.findOne({ where: { matricula, ano_referencia: ano }, transaction: t });
        if (!user) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
        }

        await Vacation.destroy({ where: { matricula, ano_referencia: ano }, transaction: t });

        const periods = [];
        const numPeriods = parseInt(qtd_periodos_str.split('_')[0]);
        for (let i = 1; i <= numPeriods; i++) {
            if (req.body[`periodo${i}_inicio`] && req.body[`periodo${i}_fim`]) {
                periods.push({
                    inicio: parseDateToUTC(req.body[`periodo${i}_inicio`]),
                    fim: parseDateToUTC(req.body[`periodo${i}_fim`])
                });
            }
        }
        
        if (periods.length === 0) {
            await t.commit();
            return res.json({ success: true, message: 'Férias removidas com sucesso!' });
        }
        
        const validationResult = await validationService.validatePeriods({
            user, periods, qtd_periodos_str, ano_referencia: ano, isEditOperation: true
        });

        // ===== MUDANÇA IMPORTANTE AQUI =====
        // Se a validação falhar, retorna um erro 400 com a mensagem detalhada.
        if (!validationResult.isValid) {
            await t.rollback();
            // Usamos .join(', ') para a resposta JSON.
            return res.status(400).json({ success: false, message: validationResult.errors.join(', ') });
        }

        for (let i = 0; i < periods.length; i++) {
            await Vacation.create({
                matricula, periodo: i + 1, data_inicio: periods[i].inicio, data_fim: periods[i].fim, ano_referencia: ano,
            }, { transaction: t });
        }

        await t.commit();
        return res.json({ success: true, message: 'Férias reagendadas com sucesso!' });

    } catch (error) {
        // Este 'catch' agora lida com erros inesperados, não erros de validação.
        await t.rollback();
        console.error('Erro ao atualizar férias:', error);
        return res.status(500).json({ success: false, message: 'Erro interno no servidor ao reagendar férias.' });
    }
}

// ===================================================================
// FUNÇÃO DO CALENDÁRIO REESCRITA PARA ELIMINAR DUPLICATAS
// ===================================================================
// controllers/vacationController.js

async function showYearCalendar(req, res) {
    try {
        const year = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();
        const categories = Array.isArray(req.query.category) ? req.query.category : [req.query.category];

        // PASSO 1: Busca TODAS as férias que ocorrem no ano do calendário,
        // independentemente do ano de referência delas.
        const yearStartDate = new Date(Date.UTC(year, 0, 1));
        const yearEndDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59));

        const vacations = await Vacation.findAll({
            where: {
                data_inicio: { [Op.lte]: yearEndDate },
                data_fim: { [Op.gte]: yearStartDate }
            },
            raw: true
        });

        // Se nenhuma férias for encontrada, renderiza o calendário vazio.
        if (vacations.length === 0) {
            return res.render('year_calendar', { calendarData: {}, year, category: categories.join(' / ') });
        }

        // PASSO 2: Coleta os pares únicos [matricula, ano_referencia] das férias encontradas.
        // Isso identifica exatamente quais "versões" dos usuários precisamos buscar.
        const userKeys = new Set(vacations.map(v => `${v.matricula}::${v.ano_referencia}`));
        const userWhereClauses = Array.from(userKeys).map(key => {
            const [matricula, ano_referencia] = key.split('::');
            return { matricula, ano_referencia: parseInt(ano_referencia) };
        });

        // PASSO 3: Busca os usuários que correspondem EXATAMENTE a esses pares
        // E TAMBÉM pertencem às categorias selecionadas.
        const targetUsers = await User.findAll({
            attributes: ['matricula', 'nome', 'ano_referencia'],
            where: {
                [Op.or]: userWhereClauses, // Busca pelos pares [matricula, ano]
                categoria: { [Op.in]: categories } // E filtra pela categoria
            },
            raw: true
        });

        // PASSO 4: Cria um mapa de usuários com uma chave composta.
        // Ex: '123::2024' -> 'Carlos2024'
        const userMap = new Map(
            targetUsers.map(u => [`${u.matricula}::${u.ano_referencia}`, u.nome])
        );

        // PASSO 5: Filtra a lista de férias original, mantendo apenas aquelas
        // cujos usuários nós encontramos no Passo 4 (ou seja, que são da categoria correta).
        const filteredVacations = vacations.filter(vac => 
            userMap.has(`${vac.matricula}::${vac.ano_referencia}`)
        );

        // PASSO 6: Processa os dados limpos para a view.
        const calendarData = {};
        filteredVacations.forEach(vac => {
            // Busca o nome usando a chave composta correta
            const userName = userMap.get(`${vac.matricula}::${vac.ano_referencia}`) || 'Desconhecido';
            
            let currentDate = new Date(vac.data_inicio);
            const endDate = new Date(vac.data_fim);

            while (currentDate <= endDate) {
                // Só adiciona ao calendário se o dia pertencer ao ano que estamos vendo
                if (currentDate.getUTCFullYear() === year) {
                    const dateKey = currentDate.toISOString().split('T')[0];
                    if (!calendarData[dateKey]) {
                        calendarData[dateKey] = [];
                    }
                    if (!calendarData[dateKey].includes(userName)) {
                        calendarData[dateKey].push(userName);
                    }
                }
                currentDate.setUTCDate(currentDate.getUTCDate() + 1);
            }
        });

        // PASSO 7: Renderiza a página.
        res.render('year_calendar', {
            calendarData,
            year,
            category: categories.join(' / ')
        });

    } catch (error) {
        console.error("Erro ao carregar calendário anual:", error);
        res.status(500).send("Ocorreu um erro ao carregar o calendário.");
    }
}




function showCalendarOptions(req, res) {
  res.render('calendar_options');
}

module.exports = {
  showAdminVacationForm, adminMarkVacation, editVacationForm, updateVacation, showYearCalendar, showCalendarOptions,
};