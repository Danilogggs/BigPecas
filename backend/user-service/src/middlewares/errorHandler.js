const { resolveFriendlyError } = require('../utils/errorMessages');

function errorHandler(err, req, res, next) {
  const { statusCode, message } = resolveFriendlyError(err);

  console.error('[user-service]', {
    method: req.method,
    path: req.originalUrl,
    statusCode,
    errorCode: err?.code || null,
    message: err?.message || 'Erro sem mensagem'
  });

  if (process.env.NODE_ENV !== 'production' && err?.stack) {
    console.error(err.stack);
  }

  return res.status(statusCode).json({
    success: false,
    message
  });
}

module.exports = errorHandler;
