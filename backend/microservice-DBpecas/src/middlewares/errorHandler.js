const { resolveFriendlyError } = require('../utils/errorMessages');
const logger = require('../utils/logger');

function errorHandler(error, req, res, next) {
  const { statusCode, message } = resolveFriendlyError(error);

  const logData = {
    method: req.method,
    path: req.originalUrl,
    statusCode,
    errorCode: error?.code || null,
    message: error?.message || 'Erro sem mensagem',
  };

  if (statusCode >= 500) {
    logger.error('Erro interno', { ...logData, stack: error?.stack });
  } else {
    logger.warn('Erro de cliente', logData);
  }

  return res.status(statusCode).json({ error: message });
}

module.exports = errorHandler;
