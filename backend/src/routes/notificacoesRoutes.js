const express = require('express');

const { supabaseAdmin } = require('../config/supabaseClient');
const verifyToken = require('../middlewares/verifyToken');
const AppError = require('../utils/AppError');

const router = express.Router();
const USERS_TABLE = process.env.SUPABASE_USER_TABLE || 'users';
const NOTIFICACOES_TABLE = process.env.SUPABASE_NOTIFICACOES_TABLE || 'notificacoes';

async function obterUsuarioPerfil(req) {
  const email = req.user?.email || null;
  if (!email) {
    throw new AppError(401, 'Não foi possível identificar o usuário autenticado.');
  }

  const { data, error } = await supabaseAdmin
    .from(USERS_TABLE)
    .select('id, email')
    .eq('email', email)
    .maybeSingle();

  if (error) throw error;
  if (!data?.id) {
    throw new AppError(404, 'Usuário não encontrado.');
  }

  return data;
}

router.get('/nao-lidas/count', verifyToken, async (req, res, next) => {
  try {
    const usuario = await obterUsuarioPerfil(req);
    const { count, error } = await supabaseAdmin
      .from(NOTIFICACOES_TABLE)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', String(usuario.id))
      .is('lida_em', null);

    if (error) throw error;

    return res.json({ count: Number(count || 0) });
  } catch (error) {
    return next(error);
  }
});

router.get('/', verifyToken, async (req, res, next) => {
  try {
    const usuario = await obterUsuarioPerfil(req);
    const { data, error } = await supabaseAdmin
      .from(NOTIFICACOES_TABLE)
      .select('id, user_id, pedido_id, tipo, titulo, mensagem, status_envio, lida_em, criada_em')
      .eq('user_id', String(usuario.id))
      .order('criada_em', { ascending: false })
      .limit(50);

    if (error) throw error;
    return res.json({ notificacoes: data || [] });
  } catch (error) {
    return next(error);
  }
});

router.patch('/:id/lida', verifyToken, async (req, res, next) => {
  try {
    const usuario = await obterUsuarioPerfil(req);
    const { data, error } = await supabaseAdmin
      .from(NOTIFICACOES_TABLE)
      .update({ lida_em: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('user_id', String(usuario.id))
      .select('id, lida_em')
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new AppError(404, 'Notificação não encontrada.');

    return res.json({ notificacao: data });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
