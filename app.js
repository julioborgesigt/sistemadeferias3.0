// app.js (VERSÃO COM LOGS LIMPOS)
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const db = require('./models');
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware de log que ignora arquivos estáticos
app.use((req, res, next) => {
    const ignoredExtensions = ['.css', '.js', '.woff2', '.map', '.ico', '.png', '.jpg', '.json'];
    const isStaticAsset = ignoredExtensions.some(ext => req.url.includes(ext));
    if (!isStaticAsset) {
        
    }
    next();
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'uma_chave_secreta_muito_forte',
  resave: false,
  saveUninitialized: false,
  cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use(flash());

app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.admin = req.session.admin || null;
  next();
});

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const vacationRoutes = require('./routes/vacationRoutes');
const publicRoutes = require('./routes/publicRoutes');

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/vacations', vacationRoutes);
app.use('/', publicRoutes);

app.get('/', (req, res) => {
    res.redirect('/auth/login');
});


db.sequelize.sync()
  .then(() => {
    // A mágica acontece aqui: app.listen() sem argumentos.
    // O Phusion Passenger irá automaticamente atribuir uma porta.
    app.listen(() => {
      console.log(`🚀 Servidor rodando e escutando em um socket gerenciado pelo Passenger.`);
    });
  })
  .catch(err => {
    console.error('❌ Erro ao sincronizar com o banco de dados:', err);
  });