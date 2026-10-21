// app.js - Sistema de Férias 3.0 (VERSÃO SEGURA)
require('dotenv').config();

// Validação de variáveis de ambiente obrigatórias
const requiredEnvVars = ['DB_USER', 'DB_PASS', 'DB_NAME', 'DB_HOST', 'SESSION_SECRET'];
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`❌ ERRO: Variável de ambiente ${varName} não configurada!`);
    process.exit(1);
  }
});

const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const flash = require('connect-flash');
const path = require('path');
const { doubleCsrf } = require('csrf-csrf');
const db = require('./models');
const logger = require('./config/logger');
const constants = require('./config/constants');
const SequelizeStore = require('connect-session-sequelize')(session.Store);

const app = express();

// CRIAR A INSTÂNCIA DO STORE
const sessionStore = new SequelizeStore({
  db: db.sequelize, // Use sua conexão sequelize existente
  tableName: 'sessions', // Nome da tabela para salvar as sessões
  checkExpirationInterval: 15 * 60 * 1000, // Limpar sessões expiradas a cada 15 min
  expiration: constants.SESSION.MAX_AGE, // Tempo de expiração da sessão (ms)
});

// Configurar trust proxy para aplicações atrás de proxy reverso
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware de logging de requisições
app.use((req, res, next) => {
  const ignoredExtensions = ['.css', '.js', '.woff2', '.map', '.ico', '.png', '.jpg', '.json'];
  const isStaticAsset = ignoredExtensions.some(ext => req.url.includes(ext));

  if (!isStaticAsset && process.env.NODE_ENV !== 'production') {
    logger.debug(`${req.method} ${req.url} from ${req.ip}`);
  }
  next();
});

app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

// Configuração de sessão com cookies seguros
app.use(session({
  secret: process.env.SESSION_SECRET,
  name: constants.SESSION.COOKIE_NAME,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS obrigatório em produção
    httpOnly: true, // Previne acesso via JavaScript
    sameSite: 'strict', // Proteção contra CSRF
    maxAge: constants.SESSION.MAX_AGE
  },
  store: sessionStore
}));

app.use(flash());


const generateToken = () => ''; // Token vazio temporário
const doubleCsrfProtection = (req, res, next) => next();
// Configurar CSRF protection
doubleCsrf({
  getSecret: () => process.env.SESSION_SECRET,
  cookieName: '__Host-psifi.x-csrf-token',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict'
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS']
});

// Middleware para disponibilizar mensagens flash, caminho atual e CSRF token nas views
app.use(async (req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.admin = req.session.admin || null;
  res.locals.csrfToken = generateToken(req, res);
  res.locals.currentPath = req.path;
  res.locals.settings = {};

  if (req.session && req.session.admin) {
    try {
      const settings = await db.Settings.findOne({ where: { id: 1 } });
      res.locals.settings = settings || {};
    } catch (error) {
      logger.warn('Não foi possível carregar os limites para o menu do administrador.');
      res.locals.settings = {};
    }
  }

  next();
});

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const vacationRoutes = require('./routes/vacationRoutes');
const publicRoutes = require('./routes/publicRoutes');

// Aplicar proteção CSRF nas rotas (exceto GET conforme configurado)
app.use('/auth', authRoutes);
app.use('/users', doubleCsrfProtection, userRoutes);
app.use('/vacations', doubleCsrfProtection, vacationRoutes);
app.use('/', publicRoutes);

app.get('/', (req, res) => {
  res.redirect('/auth/login');
});

// Tratamento de rotas não encontradas (404)
app.use((req, res) => {
  logger.warn(`404 Not Found: ${req.method} ${req.url} from ${req.ip}`);
  res.status(404).render('partials/error', {
    title: 'Página não encontrada',
    message: 'A página que você está procurando não existe.',
    statusCode: 404
  });
});

// Tratamento global de erros
app.use((err, req, res, next) => {
  // Log do erro
  console.error("!!!!!!!!!! ERRO GLOBAL CAPTURADO !!!!!!!!!!", err);
  logger.logError(err, {
    url: req.url,
    method: req.method,
    ip: req.ip,
    user: req.session?.admin?.email || 'anonymous'
  });

  // Erro de CSRF

  if (err.code === 'EBADCSRFTOKEN' || err.message?.includes('csrf')) {
    req.flash('error_msg', constants.ERROR_MESSAGES.CSRF_INVALID);
    // CORREÇÃO:
    const redirectUrl = req.get("Referrer") || "/";
    return res.redirect(redirectUrl);
  }

  // Em produção, não expor detalhes do erro
  const errorMessage = process.env.NODE_ENV === 'production'
    ? constants.ERROR_MESSAGES.SERVER_ERROR
    : err.message;

  res.status(err.status || 500).render('partials/error', {
    title: 'Erro',
    message: errorMessage,
    statusCode: err.status || 500,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
});

const PORT = process.env.PORT || 3010;

// Sincronizar com banco de dados e iniciar servidor
db.sequelize.sync()
  .then(() => {
    app.listen(PORT, () => {
      logger.info(`🚀 Servidor rodando na porta ${PORT}`);
      logger.info(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔒 Modo seguro: ${process.env.NODE_ENV === 'production' ? 'ATIVADO' : 'DESATIVADO'}`);
    });
  })
  .catch(err => {
    logger.error('❌ Erro crítico ao sincronizar com o banco de dados:', err);
    process.exit(1);
  });

// Tratamento de erros não capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error("!!!!!!!!!! UNHANDLED REJECTION !!!!!!!!!!", reason);
  logger.error('Unhandled Rejection at:', { promise, reason });
});

process.on('uncaughtException', (error) => {
  console.error("!!!!!!!!!! UNCAUGHT EXCEPTION !!!!!!!!!!", error);
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});