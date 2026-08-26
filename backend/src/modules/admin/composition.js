const { supabaseAdmin } = require('../../config/supabaseClient');
const { sincronizarStatusVendas } = require('../../services/vendasService');
const criarAdminUseCases = require('./application/criarAdminUseCases');
const criarAdminController = require('./http/criarAdminController');
const criarSupabaseAdminRepository = require('./infrastructure/SupabaseAdminRepository');

const tabelas = {
  usuarios: process.env.SUPABASE_USER_TABLE || 'users',
  pecas: process.env.SUPABASE_PECAS_TABLE || 'pecas',
  pedidos: process.env.SUPABASE_PEDIDOS_TABLE || 'pedidos',
  avaliacoesFornecedor: process.env.SUPABASE_AVALIACOES_FORNECEDOR_TABLE || 'avaliacoes_fornecedor',
  avaliacoesProduto: process.env.SUPABASE_AVALIACOES_PRODUTO_TABLE || 'avaliacoes_produto',
  preferencias: process.env.SUPABASE_ADMIN_PREFERENCES_TABLE || 'admin_dashboard_preferences',
};
const repository = criarSupabaseAdminRepository({ supabase: supabaseAdmin, tabelas });
const useCases = criarAdminUseCases({ repository, tabelas, sincronizarStatusVendas });

module.exports = criarAdminController(useCases);
