const express = require('express');
const { supabaseAdmin: supabase } = require('../config/supabaseClient');
const AppError = require('../utils/AppError');
const { sincronizarStatusVendas } = require('../services/vendasService');

const router = express.Router();
const USERS_TABLE = process.env.SUPABASE_USER_TABLE || 'users';
const PECAS_TABLE = process.env.SUPABASE_PECAS_TABLE || 'pecas';
const PEDIDOS_TABLE = process.env.SUPABASE_PEDIDOS_TABLE || 'pedidos';
const AVALIACOES_FORNECEDOR_TABLE =
  process.env.SUPABASE_AVALIACOES_FORNECEDOR_TABLE || 'avaliacoes_fornecedor';
const AVALIACOES_PRODUTO_TABLE =
  process.env.SUPABASE_AVALIACOES_PRODUTO_TABLE || 'avaliacoes_produto';
const ADMIN_PREFERENCES_TABLE =
  process.env.SUPABASE_ADMIN_PREFERENCES_TABLE || 'admin_dashboard_preferences';

const DEFAULT_WIDGETS = ['usuarios', 'pecas', 'pedidos', 'pedidos_pendentes', 'avaliacoes'];
const ALLOWED_WIDGETS = new Set([...DEFAULT_WIDGETS, 'administradores']);

const STATUS_PEDIDO = new Set([
  'aguardando_pagamento', 'pago', 'enviado', 'entregue', 'cancelado',
]);

function positiveInteger(value, fallback, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

function pagination(query) {
  const page = positiveInteger(query.page, 1);
  const limit = positiveInteger(query.limit, 20, 100);
  return { page, limit, from: (page - 1) * limit, to: page * limit - 1 };
}

function id(value, label = 'registro') {
  if (!/^\d+$/.test(String(value)) || Number(value) < 1) {
    throw new AppError(400, `O id de ${label} e invalido.`);
  }
  return Number(value);
}

async function countRows(table, configure = (query) => query) {
  const query = configure(supabase.from(table).select('*', { count: 'exact', head: true }));
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

router.get('/me', (req, res) => res.json({ admin: req.admin }));

router.get('/preferencias', async (req, res, next) => {
  try {
    const { data, error } = await supabase.from(ADMIN_PREFERENCES_TABLE)
      .select('config, updated_at').eq('user_id', req.admin.id).maybeSingle();
    if (error) throw error;
    return res.json({
      config: data?.config || { widgets: DEFAULT_WIDGETS },
      updated_at: data?.updated_at || null,
    });
  } catch (error) { return next(error); }
});

router.put('/preferencias', async (req, res, next) => {
  try {
    const widgets = req.body?.widgets;
    if (!Array.isArray(widgets) || widgets.length < 1 || widgets.length > ALLOWED_WIDGETS.size) {
      throw new AppError(400, 'Escolha entre 1 e 6 widgets para o painel.');
    }
    if (new Set(widgets).size !== widgets.length || widgets.some((widget) => !ALLOWED_WIDGETS.has(widget))) {
      throw new AppError(400, 'A configuracao contem widgets invalidos ou repetidos.');
    }

    const config = { widgets };
    const updatedAt = new Date().toISOString();
    const { data, error } = await supabase.from(ADMIN_PREFERENCES_TABLE).upsert({
      user_id: req.admin.id,
      config,
      updated_at: updatedAt,
    }, { onConflict: 'user_id' }).select('config, updated_at').single();
    if (error) throw error;
    return res.json({ message: 'Painel personalizado com sucesso.', ...data });
  } catch (error) { return next(error); }
});

router.get('/dashboard', async (req, res, next) => {
  try {
    const [usuarios, administradores, pecas, pedidos, pedidosPendentes, avaliacoesProdutos,
      avaliacoesFornecedores] = await Promise.all([
      countRows(USERS_TABLE),
      countRows(USERS_TABLE, (q) => q.eq('is_admin', true)),
      countRows(PECAS_TABLE),
      countRows(PEDIDOS_TABLE),
      countRows(PEDIDOS_TABLE, (q) => q.in('status', ['aguardando_pagamento', 'pago', 'enviado'])),
      countRows(AVALIACOES_PRODUTO_TABLE),
      countRows(AVALIACOES_FORNECEDOR_TABLE),
    ]);

    return res.json({
      usuarios,
      administradores,
      pecas,
      pedidos,
      pedidos_pendentes: pedidosPendentes,
      avaliacoes: avaliacoesProdutos + avaliacoesFornecedores,
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/usuarios', async (req, res, next) => {
  try {
    const { page, limit, from, to } = pagination(req.query);
    const search = String(req.query.search || '').trim().replace(/[,%()]/g, '');
    let query = supabase.from(USERS_TABLE).select(
      'id, email, full_name, nome_loja, telefone, tipo_usuario, email_verificado, is_admin, created_at, updated_at',
      { count: 'exact' },
    );
    if (search) query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%,nome_loja.ilike.%${search}%`);
    if (req.query.is_admin === 'true' || req.query.is_admin === 'false') {
      query = query.eq('is_admin', req.query.is_admin === 'true');
    }
    const { data, count, error } = await query.order('created_at', { ascending: false }).range(from, to);
    if (error) throw error;
    return res.json({ data: data || [], pagination: { page, limit, total: count || 0 } });
  } catch (error) {
    return next(error);
  }
});

router.patch('/usuarios/:id/admin', async (req, res, next) => {
  try {
    const userId = id(req.params.id, 'usuario');
    if (typeof req.body?.is_admin !== 'boolean') {
      throw new AppError(400, 'Informe is_admin como true ou false.');
    }

    if (!req.body.is_admin) {
      const { count, error: countError } = await supabase
        .from(USERS_TABLE).select('*', { count: 'exact', head: true }).eq('is_admin', true);
      if (countError) throw countError;
      if ((count || 0) <= 1) {
        throw new AppError(409, 'Nao e permitido remover o ultimo administrador.');
      }
    }

    const { data, error } = await supabase.from(USERS_TABLE)
      .update({ is_admin: req.body.is_admin, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select('id, email, full_name, is_admin')
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new AppError(404, 'Usuario nao encontrado.');
    return res.json({ message: 'Permissao administrativa atualizada.', usuario: data });
  } catch (error) {
    return next(error);
  }
});

router.get('/pecas', async (req, res, next) => {
  try {
    const { page, limit, from, to } = pagination(req.query);
    const search = String(req.query.search || '').trim().replace(/[,%()]/g, '');
    let query = supabase.from(PECAS_TABLE).select('*', { count: 'exact' });
    if (search) query = query.or(`nome_peca.ilike.%${search}%,sku.ilike.%${search}%,oem_number.ilike.%${search}%`);
    const { data, count, error } = await query.order('id', { ascending: false }).range(from, to);
    if (error) throw error;
    return res.json({ data: data || [], pagination: { page, limit, total: count || 0 } });
  } catch (error) { return next(error); }
});

router.delete('/pecas/:id', async (req, res, next) => {
  try {
    const pecaId = id(req.params.id, 'peca');
    const { data, error } = await supabase.from(PECAS_TABLE).delete().eq('id', pecaId)
      .select('id, nome_peca').maybeSingle();
    if (error) throw error;
    if (!data) throw new AppError(404, 'Peca nao encontrada.');
    return res.json({ message: 'Peca removida pelo administrador.', peca: data });
  } catch (error) { return next(error); }
});

router.get('/pedidos', async (req, res, next) => {
  try {
    const { page, limit, from, to } = pagination(req.query);
    let query = supabase.from(PEDIDOS_TABLE).select('*', { count: 'exact' });
    if (req.query.status) {
      if (!STATUS_PEDIDO.has(req.query.status)) throw new AppError(400, 'Status de pedido invalido.');
      query = query.eq('status', req.query.status);
    }
    const { data, count, error } = await query.order('criado_em', { ascending: false }).range(from, to);
    if (error) throw error;
    return res.json({ data: data || [], pagination: { page, limit, total: count || 0 } });
  } catch (error) { return next(error); }
});

router.patch('/pedidos/:id/status', async (req, res, next) => {
  try {
    const status = String(req.body?.status || '');
    if (!STATUS_PEDIDO.has(status)) throw new AppError(400, 'Status de pedido invalido.');
    const { data: atual, error: findError } = await supabase.from(PEDIDOS_TABLE)
      .select('id, historico').eq('id', req.params.id).maybeSingle();
    if (findError) throw findError;
    if (!atual) throw new AppError(404, 'Pedido nao encontrado.');
    const historico = [...(Array.isArray(atual.historico) ? atual.historico : []), {
      status, data: new Date().toISOString(), alterado_por_admin: req.admin.id,
    }];
    const { data, error } = await supabase.from(PEDIDOS_TABLE).update({ status, historico })
      .eq('id', req.params.id).select('*').single();
    if (error) throw error;
    await sincronizarStatusVendas(data);
    return res.json({ message: 'Status atualizado pelo administrador.', pedido: data });
  } catch (error) { return next(error); }
});

router.get('/avaliacoes/:tipo', async (req, res, next) => {
  try {
    const table = req.params.tipo === 'produtos' ? AVALIACOES_PRODUTO_TABLE
      : req.params.tipo === 'fornecedores' ? AVALIACOES_FORNECEDOR_TABLE : null;
    if (!table) throw new AppError(400, 'Use produtos ou fornecedores como tipo.');
    const { page, limit, from, to } = pagination(req.query);
    const { data, count, error } = await supabase.from(table).select('*', { count: 'exact' })
      .order('data_avaliacao', { ascending: false }).range(from, to);
    if (error) throw error;
    return res.json({ data: data || [], pagination: { page, limit, total: count || 0 } });
  } catch (error) { return next(error); }
});

router.delete('/avaliacoes/:tipo/:id', async (req, res, next) => {
  try {
    const table = req.params.tipo === 'produtos' ? AVALIACOES_PRODUTO_TABLE
      : req.params.tipo === 'fornecedores' ? AVALIACOES_FORNECEDOR_TABLE : null;
    if (!table) throw new AppError(400, 'Use produtos ou fornecedores como tipo.');
    const reviewId = id(req.params.id, 'avaliacao');
    const { data, error } = await supabase.from(table).delete().eq('id', reviewId)
      .select('id').maybeSingle();
    if (error) throw error;
    if (!data) throw new AppError(404, 'Avaliacao nao encontrada.');
    return res.json({ message: 'Avaliacao removida pelo administrador.' });
  } catch (error) { return next(error); }
});

module.exports = router;
