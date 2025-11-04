// middlewares/auth.js
// Middleware centralizado de autenticação

const constants = require('../config/constants');
const logger = require('../config/logger');

/**
 * Middleware para garantir que apenas administradores autenticados acessem as rotas.
 * Verifica se existe uma sessão válida com dados de administrador.
 */
function ensureAuthenticated(req, res, next) {
  // Verificação dupla para segurança adicional
  if (req.session && req.session.admin) {
    // Atualiza o timestamp da última atividade (para sessões rolling)
    req.session.touch();
    return next();
  }

  // Log de tentativa de acesso não autorizado
  logger.warn(`Unauthorized access attempt to ${req.url} from IP ${req.ip}`);

  // Se não houver sessão, redireciona para login com mensagem
  req.flash('error_msg', constants.ERROR_MESSAGES.UNAUTHORIZED);
  return res.redirect('/auth/login');
}

/**
 * Middleware opcional para verificar se o usuário já está autenticado
 * Útil para páginas de login (redirecionar para dashboard se já logado)
 */
function redirectIfAuthenticated(req, res, next) {
  if (req.session && req.session.admin) {
    return res.redirect('/users/dashboard');
  }
  next();
}

/**
 * Middleware para verificar timeout de sessão
 * Pode ser usado para implementar logout automático por inatividade
 */
function checkSessionTimeout(req, res, next) {
  if (req.session && req.session.admin) {
    const now = Date.now();
    const lastActivity = req.session.lastActivity || now;
    const sessionTimeout = constants.SESSION.MAX_AGE;

    if (now - lastActivity > sessionTimeout) {
      req.session.destroy((err) => {
        if (err) {
          logger.error('Error destroying expired session', err);
        }
      });
      req.flash('error_msg', constants.ERROR_MESSAGES.SESSION_EXPIRED);
      return res.redirect('/auth/login');
    }

    req.session.lastActivity = now;
  }
  next();
}

module.exports = {
  ensureAuthenticated,
  redirectIfAuthenticated,
  checkSessionTimeout
};
