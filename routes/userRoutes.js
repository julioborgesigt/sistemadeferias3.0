// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { ensureAuthenticated } = require('../middlewares/auth');

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