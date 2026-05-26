const express = require('express');
const router = express.Router();
const supabase = require('../config/db');
const AppError = require('../utils/AppError');

const PECAS_TABLE = process.env.SUPABASE_PECAS_TABLE || 'pecas';
const USERS_TABLE = process.env.SUPABASE_USER_TABLE || 'users';
const WHITELIST_TABLE = process.env.SUPABASE_WHITELIST_TABLE || 'whitelist';

function validarId(id, mensagem = 'Informe um identificador válido.') {
  if (!/^\d+$/.test(String(id)) || Number(id) < 1) {
    throw new AppError(400, mensagem);
  }

  return Number(id);
}

function obterEmailUsuarioAutenticado(req) {
  return (
    req.user?.email ||
    req.user?.user?.email ||
    req.authUser?.email ||
    req.usuario?.email ||
    null
  );
}

async function obterUsuarioAtual(req) {
  const emailUsuario = obterEmailUsuarioAutenticado(req);

  if (!emailUsuario) {
    throw new AppError(401, 'Não foi possível identificar o e-mail do usuário logado.');
  }

  const { data, error } = await supabase
    .from(USERS_TABLE)
    .select('id, email, full_name')
    .eq('email', emailUsuario)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.id) {
    throw new AppError(404, 'Usuário não encontrado na tabela users.');
  }

  return data;
}

async function buscarPecaPorId(id) {
  const { data, error } = await supabase
    .from(PECAS_TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function buscarItemWhitelist(userId, pecaId) {
  const { data, error } = await supabase
    .from(WHITELIST_TABLE)
    .select('*')
    .eq('user_id', userId)
    .eq('peca_id', pecaId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

function ordenarPecasPorWhitelist(pecas = [], whitelistItems = []) {
  const ordemPorPeca = new Map(
    whitelistItems.map((item, index) => [String(item.peca_id), index])
  );

  return [...pecas].sort((a, b) => {
    const ordemA = ordemPorPeca.get(String(a.id)) ?? 999999;
    const ordemB = ordemPorPeca.get(String(b.id)) ?? 999999;
    return ordemA - ordemB;
  });
}

router.get('/', async (req, res, next) => {
  try {
    const usuario = await obterUsuarioAtual(req);

    const { data: whitelistItems, error: whitelistError } = await supabase
      .from(WHITELIST_TABLE)
      .select('*')
      .eq('user_id', usuario.id)
      .order('created_at', { ascending: false });

    if (whitelistError) {
      throw whitelistError;
    }

    const pecaIds = [...new Set((whitelistItems || []).map((item) => item.peca_id).filter(Boolean))];

    if (pecaIds.length === 0) {
      return res.json({
        message: 'Sua whitelist está vazia.',
        total: 0,
        itens: [],
        pecas: [],
      });
    }

    const { data: pecas, error: pecasError } = await supabase
      .from(PECAS_TABLE)
      .select('*')
      .in('id', pecaIds);

    if (pecasError) {
      throw pecasError;
    }

    const pecasOrdenadas = ordenarPecasPorWhitelist(pecas || [], whitelistItems || []);

    return res.json({
      message: 'Whitelist carregada com sucesso.',
      total: pecasOrdenadas.length,
      itens: whitelistItems || [],
      pecas: pecasOrdenadas,
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/status/:pecaId', async (req, res, next) => {
  try {
    const usuario = await obterUsuarioAtual(req);
    const pecaId = validarId(req.params.pecaId, 'Informe uma peça válida.');
    const item = await buscarItemWhitelist(usuario.id, pecaId);

    return res.json({
      peca_id: pecaId,
      in_whitelist: Boolean(item),
      item: item || null,
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/:pecaId', async (req, res, next) => {
  try {
    const usuario = await obterUsuarioAtual(req);
    const pecaId = validarId(req.params.pecaId, 'Informe uma peça válida.');

    const peca = await buscarPecaPorId(pecaId);

    if (!peca) {
      throw new AppError(404, 'Peça não encontrada.');
    }

    const itemExistente = await buscarItemWhitelist(usuario.id, pecaId);

    if (itemExistente) {
      return res.status(200).json({
        message: 'Essa peça já está na sua whitelist.',
        item: itemExistente,
        peca,
      });
    }

    const { data, error } = await supabase
      .from(WHITELIST_TABLE)
      .insert({
        user_id: usuario.id,
        peca_id: pecaId,
      })
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return res.status(201).json({
      message: 'Peça adicionada à sua whitelist.',
      item: data,
      peca,
    });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:pecaId', async (req, res, next) => {
  try {
    const usuario = await obterUsuarioAtual(req);
    const pecaId = validarId(req.params.pecaId, 'Informe uma peça válida.');

    const { error } = await supabase
      .from(WHITELIST_TABLE)
      .delete()
      .eq('user_id', usuario.id)
      .eq('peca_id', pecaId);

    if (error) {
      throw error;
    }

    return res.json({
      message: 'Peça removida da sua whitelist.',
      peca_id: pecaId,
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
