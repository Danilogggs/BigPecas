const { supabaseAdmin } = require('../../config/supabaseClient');
const criarCarrinhoUseCases = require('./application/criarCarrinhoUseCases');
const criarCarrinhoController = require('./http/criarCarrinhoController');
const criarSupabaseCarrinhoRepository = require('./infrastructure/SupabaseCarrinhoRepository');

const repository = criarSupabaseCarrinhoRepository({
  supabase: supabaseAdmin,
  tabelas: {
    carrinhos: process.env.SUPABASE_CARRINHOS_TABLE || 'carrinhos',
    pecas: process.env.SUPABASE_PECAS_TABLE || 'pecas',
    usuarios: process.env.SUPABASE_USER_TABLE || 'users',
  },
});
module.exports = criarCarrinhoController(criarCarrinhoUseCases({ repository }));
