const SENSITIVE_KEY = /password|senha|token|authorization|cookie|secret|api[_-]?key|card|cartao|cartão|cvv|cvc|security[_-]?code/i;
const MAX_DEPTH = 5;
const MAX_ARRAY_ITEMS = 50;
const MAX_OBJECT_KEYS = 100;
const MAX_STRING_LENGTH = 2000;

function sanitizeAuditValue(value, depth = 0) {
  if (value == null || typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.length > MAX_STRING_LENGTH
      ? `${value.slice(0, MAX_STRING_LENGTH)}… [truncado]`
      : value;
  }
  if (depth >= MAX_DEPTH) return '[limite de profundidade]';
  if (Array.isArray(value)) {
    const sanitized = value.slice(0, MAX_ARRAY_ITEMS).map(item => sanitizeAuditValue(item, depth + 1));
    if (value.length > MAX_ARRAY_ITEMS) sanitized.push(`[mais ${value.length - MAX_ARRAY_ITEMS} itens]`);
    return sanitized;
  }
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).slice(0, MAX_OBJECT_KEYS).map(([key, item]) => [
      key,
      SENSITIVE_KEY.test(key) ? '[REMOVIDO]' : sanitizeAuditValue(item, depth + 1),
    ]));
  }
  return String(value);
}

module.exports = { sanitizeAuditValue };
