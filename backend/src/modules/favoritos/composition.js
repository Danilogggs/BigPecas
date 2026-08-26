const { supabaseAdmin } = require('../../config/supabaseClient');
const criarFavoritosUseCases = require('./application/criarFavoritosUseCases');
const criarFavoritosController = require('./http/criarFavoritosController');
const criarSupabaseFavoritosRepository = require('./infrastructure/SupabaseFavoritosRepository');

const repository = criarSupabaseFavoritosRepository({
  supabase: supabaseAdmin,
  tabelas: {
    pecas: process.env.SUPABASE_PECAS_TABLE || 'pecas',
    usuarios: process.env.SUPABASE_USER_TABLE || 'users',
    favoritos: process.env.SUPABASE_WISH_TABLE || process.env.SUPABASE_WISHLIST_TABLE || 'wishlist',
  },
});
module.exports = criarFavoritosController(criarFavoritosUseCases({ repository }));
