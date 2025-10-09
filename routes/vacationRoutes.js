// routes/vacationRoutes.js
const express = require('express');
const router = express.Router();
const vacationController = require('../controllers/vacationController');

/**
 * Middleware para garantir que apenas administradores autenticados acessem as rotas.
 */
function ensureAuthenticated(req, res, next) {
  if (req.session && req.session.admin) {
    return next();
  }
  req.flash('error_msg', 'Acesso não autorizado. Por favor, faça login.');
  res.redirect('/auth/login');
}

// Rotas públicas (acessíveis sem login)
router.get('/calendar-options', vacationController.showCalendarOptions);
router.get('/year-calendar', vacationController.showYearCalendar);

// As rotas abaixo são protegidas e exigem login de administrador.
router.use(ensureAuthenticated);

// Exibir formulário para o admin cadastrar férias
router.get('/admin-form', vacationController.showAdminVacationForm);

// Processar o cadastro de férias pelo admin
router.post('/admin-mark', vacationController.adminMarkVacation);

// Exibir formulário de edição de férias (usado no modal via fetch)
router.get('/edit/:matricula/:ano', vacationController.editVacationForm);

// Processar a atualização das férias
router.post('/edit/:matricula/:ano', vacationController.updateVacation);

module.exports = router;