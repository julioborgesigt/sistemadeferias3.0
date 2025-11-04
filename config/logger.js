// config/logger.js
// Sistema de logging centralizado usando Winston

const winston = require('winston');
const path = require('path');
const constants = require('./constants');

// Criar diretório de logs se não existir
const logsDir = path.join(__dirname, '..', 'logs');
const fs = require('fs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Formato customizado para os logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    if (stack) {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}\n${stack}`;
    }
    return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  })
);

// Configurar transportes baseados no ambiente
const transports = [];

// Sempre loga erros em arquivo
transports.push(
  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: constants.LOGGING.LEVELS.ERROR,
    maxsize: constants.LOGGING.FILE_MAX_SIZE,
    maxFiles: constants.LOGGING.FILE_MAX_FILES
  })
);

// Log combinado (todos os níveis)
transports.push(
  new winston.transports.File({
    filename: path.join(logsDir, 'combined.log'),
    maxsize: constants.LOGGING.FILE_MAX_SIZE,
    maxFiles: constants.LOGGING.FILE_MAX_FILES
  })
);

// Em desenvolvimento, também loga no console
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  );
}

// Criar o logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production'
    ? constants.LOGGING.LEVELS.INFO
    : constants.LOGGING.LEVELS.DEBUG,
  format: logFormat,
  transports: transports,
  exitOnError: false
});

// Função helper para logar requisições HTTP
logger.logRequest = (req, message) => {
  const logData = {
    method: req.method,
    url: req.url,
    ip: req.ip,
    user: req.session?.admin?.email || 'anonymous'
  };
  logger.info(`${message} - ${JSON.stringify(logData)}`);
};

// Função helper para logar erros com contexto
logger.logError = (error, context = {}) => {
  logger.error(`Error: ${error.message}`, {
    stack: error.stack,
    context: context
  });
};

module.exports = logger;
