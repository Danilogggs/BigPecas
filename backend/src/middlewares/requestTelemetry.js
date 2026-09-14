const { randomUUID } = require('node:crypto');
const logger = require('../utils/logger');

module.exports = function requestTelemetry(req, res, next) {
  const started = process.hrtime.bigint();
  // Nunca registrar query string, corpo, token ou cabecalhos do usuario.
  const requestId = randomUUID();
  res.setHeader('X-Request-ID', requestId);
  res.on('finish', () => {
    if (req.path === '/api/health') return;
    const statusCode = res.statusCode;
    logger.log(statusCode >= 500 ? 'error' : 'info', 'http_request', {
      requestId,
      method: req.method,
      route: req.route?.path || 'unmatched',
      statusCode,
      durationMs: Number(process.hrtime.bigint() - started) / 1e6,
    });
  });
  next();
};
