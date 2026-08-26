const { supabaseAdmin } = require('../../config/supabaseClient');
const vendasService = require('../../services/vendasService');
const emailService = require('../../services/emailService');
const criarPedidosUseCases = require('./application/criarPedidosUseCases');
const criarPedidosController = require('./http/criarPedidosController');
const criarSupabasePedidosRepository = require('./infrastructure/SupabasePedidosRepository');

const repository = criarSupabasePedidosRepository({
  supabase: supabaseAdmin,
  tabelas: {
    pedidos: process.env.SUPABASE_PEDIDOS_TABLE || 'pedidos',
    pecas: process.env.SUPABASE_PECAS_TABLE || 'pecas',
    usuarios: process.env.SUPABASE_USER_TABLE || 'users',
  },
});

const useCases = criarPedidosUseCases({
  repository,
  vendasService,
  emailService,
});

module.exports = criarPedidosController(useCases);
