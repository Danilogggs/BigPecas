const { supabaseAdmin } = require('../config/supabaseClient');
const AppError = require('../utils/AppError');
async function verifyAvaliador(req, _res, next) {
  try {
    const email = String(req.user?.email || '').trim().toLowerCase();
    if (!email) throw new AppError(401, 'Autenticação necessária.');
    const { data, error } = await supabaseAdmin.from(process.env.SUPABASE_USER_TABLE || 'users')
      .select('id, tipo_usuario, is_admin').eq('email', email).maybeSingle();
    if (error) throw error;
    if (!data || (data.tipo_usuario !== 'avaliador' && data.is_admin !== true)) {
      throw new AppError(403, 'Acesso permitido somente a avaliadores e administradores.');
    }
    req.avaliador = data;
    next();
  } catch (error) { next(error); }
}
module.exports = { verifyAvaliador };

