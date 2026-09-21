const { supabaseAdmin } = require('../../config/supabaseClient');
const criarPecasUseCases = require('./application/criarPecasUseCases');
const criarPecasController = require('./http/criarPecasController');
const criarVerificacaoOemController = require('./http/criarVerificacaoOemController');
const criarSupabasePecasRepository = require('./infrastructure/SupabasePecasRepository');
const { validarENormalizarOem } = require('./domain/oem');
const { criarAutoPartsService } = require('../../services/autoPartsService');

const repository = criarSupabasePecasRepository({
  supabase: supabaseAdmin,
  tabelas: {
    pecas: process.env.SUPABASE_PECAS_TABLE || 'pecas',
    usuarios: process.env.SUPABASE_USER_TABLE || 'users',
    categorias: process.env.SUPABASE_CATEGORIAS_TABLE || 'categorias',
    materiais: process.env.SUPABASE_MATERIAIS_TABLE || 'materiais',
    pedidos: process.env.SUPABASE_PEDIDOS_TABLE || 'pedidos',
    avaliacoesFornecedor: process.env.SUPABASE_AVALIACOES_FORNECEDOR_TABLE || 'avaliacoes_fornecedor',
  },
});

const autoPartsService = criarAutoPartsService();
const pecasController = criarPecasController(criarPecasUseCases({ repository, autoPartsService }));
const verificarOem = criarVerificacaoOemController({
  autoPartsService,
  validarENormalizarOem,
});

module.exports = Object.freeze({ ...pecasController, verificarOem });
