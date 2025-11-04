// config/constants.js
// Arquivo de constantes para evitar magic numbers e strings no código

module.exports = {
  // Configurações de férias
  VACATION_DAYS: {
    FULL_PERIOD: 30,
    MIN_SPLIT_PERIOD: 10,
    MAX_SPLIT_PERIODS: 3
  },

  // Configurações de sessão
  SESSION: {
    MAX_AGE: 24 * 60 * 60 * 1000, // 24 horas em milissegundos
    COOKIE_NAME: 'connect.sid'
  },

  // Configurações de segurança
  SECURITY: {
    BCRYPT_SALT_ROUNDS: 10,
    LOGIN_RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutos
    LOGIN_RATE_LIMIT_MAX_ATTEMPTS: 5,
    PASSWORD_MIN_LENGTH: 8
  },

  // Configurações de logging
  LOGGING: {
    LEVELS: {
      ERROR: 'error',
      WARN: 'warn',
      INFO: 'info',
      DEBUG: 'debug'
    },
    FILE_MAX_SIZE: 5 * 1024 * 1024, // 5MB
    FILE_MAX_FILES: 5
  },

  // Categorias de usuários
  USER_CATEGORIES: {
    IPC: 'IPC',
    IPC_P: 'IPC-P',
    EPC: 'EPC',
    EPC_P: 'EPC-P',
    DPC: 'DPC',
    DPC_P: 'DPC-P'
  },

  // Mensagens de erro padrão
  ERROR_MESSAGES: {
    UNAUTHORIZED: 'Acesso não autorizado. Por favor, faça login.',
    INVALID_CREDENTIALS: 'Email ou senha inválidos.',
    SESSION_EXPIRED: 'Sua sessão expirou. Por favor, faça login novamente.',
    RATE_LIMIT_EXCEEDED: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    CSRF_INVALID: 'Token de segurança inválido. Por favor, recarregue a página.',
    SERVER_ERROR: 'Ocorreu um erro interno no servidor.'
  }
};
