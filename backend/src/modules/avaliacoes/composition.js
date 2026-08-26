const { supabaseAdmin } = require('../../config/supabaseClient');
const { garantirVendasDoPedido } = require('../../services/vendasService');
const criarAvaliacoesUseCases = require('./application/criarAvaliacoesUseCases');
const criarAvaliacoesController = require('./http/criarAvaliacoesController');
const criarSupabaseAvaliacoesRepository = require('./infrastructure/SupabaseAvaliacoesRepository');

const repository = criarSupabaseAvaliacoesRepository({
  supabase: supabaseAdmin,
  tabelas: {
    pedidos: process.env.SUPABASE_PEDIDOS_TABLE || 'pedidos',
    usuarios: process.env.SUPABASE_USER_TABLE || 'users',
    fornecedores: process.env.SUPABASE_AVALIACOES_FORNECEDOR_TABLE || 'avaliacoes_fornecedor',
    produtos: process.env.SUPABASE_AVALIACOES_PRODUTO_TABLE || 'avaliacoes_produto',
  },
});
const useCases = criarAvaliacoesUseCases({ repository, garantirVendasDoPedido });
module.exports = criarAvaliacoesController(useCases);
