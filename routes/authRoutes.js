// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const authController = require('../controllers/authController');
const { redirectIfAuthenticated } = require('../middlewares/auth');
const constants = require('../config/constants');

// Rate limiter para prevenir ataques de força bruta
const loginLimiter = rateLimit({
  windowMs: constants.SECURITY.LOGIN_RATE_LIMIT_WINDOW,
  max: constants.SECURITY.LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
  message: constants.ERROR_MESSAGES.RATE_LIMIT_EXCEEDED,
  standardHeaders: true,
  legacyHeaders: false,
  // Armazena tentativas por IP + email para maior segurança
  keyGenerator: (req) => {
    // 1. Extrai o IP de forma segura (trata IPv4 e IPv6)
    const ip = ipKeyGenerator(req); 
    // 2. Retorna sua chave personalizada combinada
    return `${ip}_${req.body.email || 'unknown'}`;
  },
  handler: (req, res) => {
    req.flash('error_msg', constants.ERROR_MESSAGES.RATE_LIMIT_EXCEEDED);
    res.redirect('/auth/login');
  }
});

// Rota para exibir o formulário de login
// GET /auth/login - Redireciona para dashboard se já estiver logado
router.get('/login', redirectIfAuthenticated, authController.loginForm);

// Rota para processar os dados do formulário de login
// POST /auth/login - Com proteção contra força bruta
router.post('/login', loginLimiter, authController.login);

// Rota para realizar o logout do administrador
// GET /auth/logout
router.get('/logout', authController.logout);

module.exports = router;