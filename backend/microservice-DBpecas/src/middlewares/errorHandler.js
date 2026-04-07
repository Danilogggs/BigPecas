const { resolveFriendlyError } = require('../utils/errorMessages');

function errorHandler(error, req, res, next) {
  const { statusCode, message } = resolveFriendlyError(error);

  console.error('[microservice-DBpecas]', {
    method: req.method,
    path: req.originalUrl,
    statusCode,
    errorCode: error?.code || null,
    message: error?.message || 'Erro sem mensagem'
  });

  if (process.env.NODE_ENV !== 'production' && error?.stack) {
    console.error(error.stack);
  }

  return res.status(statusCode).json({
    error: message
  });
}

module.exports = errorHandler;
