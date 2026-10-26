const auditService = require('../services/auditService');
const logger = require('../utils/logger');
const { sanitizeAuditValue } = require('../services/auditMetadata');

const DATABASE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function auditBackendActions(req, res, next) {
  if (!req.user || req.path.startsWith('/api/admin/auditoria')) return next();
  const shouldRecord = !['HEAD', 'OPTIONS'].includes(req.method);
  if (!shouldRecord) return next();

  const startedAt = Date.now();
  let responseBody = null;
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    responseBody = sanitizeAuditValue(body);
    return originalJson(body);
  };

  res.on('finish', () => {
    const functionality = auditService.functionalityFromPath(req.originalUrl.split('?')[0]);
    auditService.record({
      functionality_key: functionality,
      event_type: DATABASE_METHODS.has(req.method) ? 'database' : 'backend',
      action: `${req.method} ${req.route?.path || req.path}`,
      page_path: req.get('x-page-path') || null,
      http_method: req.method,
      endpoint: req.originalUrl.split('?')[0],
      status_code: res.statusCode,
      success: res.statusCode < 400,
      user: req.user,
      metadata: sanitizeAuditValue({
        request_id: req.requestId || null,
        duration_ms: Date.now() - startedAt,
        ip: req.ip || null,
        user_agent: req.get('user-agent') || null,
        resource_id: req.params?.id || req.params?.pecaId || null,
        request: {
          params: req.params || {},
          query: req.query || {},
          body: req.body || {},
        },
        response: responseBody,
      }),
    }).catch((error) => logger.warn('Falha ao registrar auditoria', { error: error.message }));
  });
  return next();
}

module.exports = auditBackendActions;
