const { supabaseAdmin, supabasePublic } = require('../../config/supabaseClient');
const criarUsuariosUseCases = require('./application/criarUsuariosUseCases');
const criarUsuariosController = require('./http/criarUsuariosController');
const criarSupabaseUsuariosRepository = require('./infrastructure/SupabaseUsuariosRepository');

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
const repository = criarSupabaseUsuariosRepository({
  supabaseAdmin,
  supabasePublic,
  userTable: process.env.SUPABASE_USER_TABLE || 'users',
});
const useCases = criarUsuariosUseCases({
  repository,
  emailConfirmRedirectTo: process.env.SUPABASE_EMAIL_CONFIRM_REDIRECT_TO
    || `${frontendUrl}/login?emailConfirmado=1`,
});

module.exports = criarUsuariosController(useCases);
