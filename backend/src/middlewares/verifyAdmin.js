const { supabaseAdmin } = require('../config/supabaseClient');
const AppError = require('../utils/AppError');

const USERS_TABLE = process.env.SUPABASE_USER_TABLE || 'users';

/**
 * Deve ser usado depois de verifyToken. A permissao e lida do banco em todas as
 * requisicoes para que um token antigo perca o acesso assim que o perfil mudar.
 */
async function verifyAdmin(req, res, next) {
  try {
    const email = String(req.user?.email || '').trim().toLowerCase();

    if (!email) {
      return next(new AppError(401, 'Nao foi possivel identificar o usuario autenticado.'));
    }

    const { data: profile, error } = await supabaseAdmin
      .from(USERS_TABLE)
      .select('id, email, full_name, is_admin')
      .ilike('email', email)
      .maybeSingle();

    if (error) throw error;

    if (!profile?.is_admin) {
      return next(new AppError(403, 'Acesso permitido somente para administradores.'));
    }

    req.admin = profile;
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = verifyAdmin;
