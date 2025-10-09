// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Rota para exibir o formulário de login
// GET /auth/login
router.get('/login', authController.loginForm);

// Rota para processar os dados do formulário de login
// POST /auth/login
router.post('/login', authController.login);

// Rota para realizar o logout do administrador
// GET /auth/logout
router.get('/logout', authController.logout);

module.exports = router;