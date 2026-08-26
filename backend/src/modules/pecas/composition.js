const { supabaseAdmin } = require('../../config/supabaseClient');
const criarPecasUseCases = require('./application/criarPecasUseCases');
const criarPecasController = require('./http/criarPecasController');
const criarSupabasePecasRepository = require('./infrastructure/SupabasePecasRepository');

const repository = criarSupabasePecasRepository({
  supabase: supabaseAdmin,
  tabelas: {
    pecas: process.env.SUPABASE_PECAS_TABLE || 'pecas',
    usuarios: process.env.SUPABASE_USER_TABLE || 'users',
    categorias: process.env.SUPABASE_CATEGORIAS_TABLE || 'categorias',
    materiais: process.env.SUPABASE_MATERIAIS_TABLE || 'materiais',
  },
});

module.exports = criarPecasController(criarPecasUseCases({ repository }));
