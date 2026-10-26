const { supabaseAdmin } = require('../config/supabaseClient');

const FUNCTIONALITIES_TABLE = process.env.SUPABASE_AUDIT_FUNCTIONALITIES_TABLE || 'audit_functionalities';
const LOGS_TABLE = process.env.SUPABASE_AUDIT_LOGS_TABLE || 'audit_logs';
const USERS_TABLE = process.env.SUPABASE_USER_TABLE || 'users';

const ROUTE_RULES = [
  [/^\/api\/pecas(?:\/|$)/, 'cadastro_peca'],
  [/^\/api\/avaliacoes(?:\/|$)/, 'avaliacao'],
  [/^\/api\/pedidos(?:\/|$)/, 'pedidos'],
  [/^\/api\/avaliador(?:\/|$)/, 'avaliador'],
  [/^\/api\/admin\/avaliacoes(?:\/|$)/, 'avaliacao'],
  [/^\/api\/admin\/pedidos(?:\/|$)/, 'pedidos'],
  [/^\/api\/admin\/pecas(?:\/|$)/, 'cadastro_peca'],
  [/^\/api\/admin\/auditoria(?:\/|$)/, 'auditoria'],
  [/^\/api\/admin(?:\/|$)/, 'admin'],
  [/^\/api\/wish(?:\/|$)/, 'favoritos'],
  [/^\/api\/frete(?:\/|$)/, 'checkout'],
  [/^\/api\/notificacoes(?:\/|$)/, 'notificacoes'],
  [/^\/api\/auth(?:\/|$)/, 'usuarios'],
];

function functionalityFromPath(path = '') {
  return ROUTE_RULES.find(([pattern]) => pattern.test(path))?.[1] || 'catalogo';
}

async function getActor(user) {
  if (!user?.email) return { actor_auth_id: user?.id || null };
  const { data } = await supabaseAdmin.from(USERS_TABLE)
    .select('id, email, full_name').ilike('email', user.email).maybeSingle();
  return {
    actor_auth_id: user.id || null,
    actor_user_id: data?.id || null,
    actor_email: data?.email || user.email,
    actor_name: data?.full_name || user.user_metadata?.full_name || null,
  };
}

async function isEnabled(key) {
  const { data, error } = await supabaseAdmin.from(FUNCTIONALITIES_TABLE)
    .select('enabled').eq('key', key).maybeSingle();
  if (error) throw error;
  return Boolean(data?.enabled);
}

async function record(event) {
  if (!await isEnabled(event.functionality_key)) return false;
  const actor = await getActor(event.user);
  const { error } = await supabaseAdmin.from(LOGS_TABLE).insert({
    functionality_key: event.functionality_key,
    event_type: event.event_type,
    action: String(event.action || '').slice(0, 300),
    page_path: event.page_path || null,
    http_method: event.http_method || null,
    endpoint: event.endpoint || null,
    status_code: event.status_code || null,
    success: event.success !== false,
    ...actor,
    metadata: event.metadata || {},
  });
  if (error) throw error;
  return true;
}

module.exports = { functionalityFromPath, getActor, isEnabled, record, FUNCTIONALITIES_TABLE, LOGS_TABLE };
