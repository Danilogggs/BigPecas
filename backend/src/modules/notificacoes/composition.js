const { supabaseAdmin } = require('../../config/supabaseClient');
const criarNotificacoesUseCases = require('./application/criarNotificacoesUseCases');
const criarNotificacoesController = require('./http/criarNotificacoesController');
const criarSupabaseNotificacoesRepository = require('./infrastructure/SupabaseNotificacoesRepository');

const repository = criarSupabaseNotificacoesRepository({
  supabase: supabaseAdmin,
  tabelas: {
    usuarios: process.env.SUPABASE_USER_TABLE || 'users',
    notificacoes: process.env.SUPABASE_NOTIFICACOES_TABLE || 'notificacoes',
  },
});
module.exports = criarNotificacoesController(criarNotificacoesUseCases({ repository }));
