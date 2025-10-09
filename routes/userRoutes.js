// routes/userRoutes.js (VERSÃO CORRIGIDA)
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

/**
 * Middleware para garantir que apenas administradores autenticados acessem as rotas.
 */
function ensureAuthenticated(req, res, next) {
  // A verificação 'req.isAuthenticated()' é um método mais robusto que o connect-flash
  // pode fornecer, mas uma verificação simples na sessão também funciona.
  // A verificação dupla (req.session && req.session.admin) é uma boa prática.
  if (req.session && req.session.admin) {
    return next(); // Se a sessão do admin existe, permite o acesso.
  }
  
  // Se não houver sessão, define a mensagem de erro e redireciona para o login.
  req.flash('error_msg', 'Acesso não autorizado. Por favor, faça login.');
  res.redirect('/auth/login');
}

// Todas as rotas abaixo são protegidas e exigem login de administrador.
router.use(ensureAuthenticated);

// Rota NOVA: Busca os anos de referência para uma matrícula específica
router.get('/years/:matricula', userController.getUserYears);

// Dashboard principal do administrador
router.get('/dashboard', userController.dashboard);

// Exibir formulário de cadastro de usuário
router.get('/register', userController.showRegistrationForm);

// Processar cadastro de novo usuário
router.post('/register', userController.registerUser);

// Atualizar limites de férias
router.post('/update-limits', userController.updateLimits);

// Resetar férias de um usuário
router.post('/reset-vacations', userController.resetVacations);

// Apagar um registro de usuário (matrícula + ano)
router.post('/delete-user', userController.deleteUser);

// Migrar dados de usuários de um ano para outro
router.post('/migrate', userController.migrateUsers);

// Exibir formulário de edição de usuário (usado no modal)
router.get('/edit/:matricula/:ano', userController.editUserForm);

// Processar a atualização de um usuário
router.post('/update/:matricula/:ano', userController.updateUser);


module.exports = router;