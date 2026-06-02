const express = require('express');
const router = express.Router();
const supabase = require('../config/db');
const AppError = require('../utils/AppError');

const PEDIDOS_TABLE = process.env.SUPABASE_PEDIDOS_TABLE || 'pedidos';
const USERS_TABLE = process.env.SUPABASE_USER_TABLE || 'users';

const STATUS_VALIDOS = [
  'aguardando_pagamento',
  'pago',
  'enviado',
  'entregue',
  'cancelado',
];

function gerarCodigoRastreio() {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const numero = String(Math.floor(Math.random() * 1000000000)).padStart(9, '0');
  const a = letras[Math.floor(Math.random() * letras.length)];
  const b = letras[Math.floor(Math.random() * letras.length)];
  return `BG${numero}${a}${b}`;
}

function gerarNumeroPedido() {
  const ano = new Date().getFullYear();
  const random = Math.floor(Math.random() * 900000 + 100000);
  return `${ano}-${random}`;
}

async function obterUsuarioAtual(req) {
  const email = req.user?.email || req.user?.user?.email || null;

  if (!email) {
    throw new AppError(401, 'Não foi possível identificar o usuário autenticado.');
  }

  const { data, error } = await supabase
    .from(USERS_TABLE)
    .select('id, email, full_name')
    .eq('email', email)
    .maybeSingle();

  if (error) throw error;

  if (!data?.id) {
    throw new AppError(404, 'Usuário não encontrado.');
  }

  return data;
}

// GET /api/pedidos — lista todos os pedidos do usuário autenticado
router.get('/', async (req, res, next) => {
  try {
    const usuario = await obterUsuarioAtual(req);

    const { data, error } = await supabase
      .from(PEDIDOS_TABLE)
      .select('*')
      .eq('user_id', usuario.id)
      .order('criado_em', { ascending: false });

    if (error) throw error;

    return res.json(data || []);
  } catch (error) {
    return next(error);
  }
});

// GET /api/pedidos/:id — detalhe de um pedido (somente do próprio usuário)
router.get('/:id', async (req, res, next) => {
  try {
    const usuario = await obterUsuarioAtual(req);

    const { data, error } = await supabase
      .from(PEDIDOS_TABLE)
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', usuario.id)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      throw new AppError(404, 'Pedido não encontrado.');
    }

    return res.json(data);
  } catch (error) {
    return next(error);
  }
});

// POST /api/pedidos — cria um novo pedido
router.post('/', async (req, res, next) => {
  try {
    const usuario = await obterUsuarioAtual(req);

    const { itens, frete, cupom, endereco, forma_pagamento } = req.body;

    if (!Array.isArray(itens) || itens.length === 0) {
      throw new AppError(400, 'O pedido deve conter ao menos um item.');
    }

    if (!endereco) {
      throw new AppError(400, 'Endereço de entrega é obrigatório.');
    }

    if (!forma_pagamento) {
      throw new AppError(400, 'Forma de pagamento é obrigatória.');
    }

    const subtotal = itens.reduce(
      (soma, item) => soma + Number(item.preco || 0) * Number(item.quantidade || 1),
      0,
    );

    let desconto = 0;
    let valor_frete = Number(frete?.valor || 0);

    if (cupom) {
      if (cupom.tipo === 'percentual') {
        desconto = subtotal * Number(cupom.valor || 0);
      } else if (cupom.tipo === 'frete_gratis') {
        desconto = valor_frete;
        valor_frete = 0;
      }
    }

    const total = Math.max(0, subtotal - desconto + valor_frete);

    const codigo_rastreio = gerarCodigoRastreio();
    const numero_pedido = gerarNumeroPedido();
    const agora = new Date().toISOString();

    const novoPedido = {
      id: numero_pedido,
      user_id: usuario.id,
      status: 'aguardando_pagamento',
      itens,
      frete,
      cupom: cupom || null,
      endereco,
      forma_pagamento,
      subtotal,
      desconto,
      valor_frete,
      total,
      codigo_rastreio,
      historico: [{ status: 'aguardando_pagamento', data: agora }],
      criado_em: agora,
    };

    const { data, error } = await supabase
      .from(PEDIDOS_TABLE)
      .insert(novoPedido)
      .select('*')
      .single();

    if (error) throw error;

    return res.status(201).json(data);
  } catch (error) {
    return next(error);
  }
});

// PATCH /api/pedidos/:id/status — atualiza o status de um pedido
router.patch('/:id/status', async (req, res, next) => {
  try {
    const usuario = await obterUsuarioAtual(req);

    const { status } = req.body;

    if (!status || !STATUS_VALIDOS.includes(status)) {
      throw new AppError(
        400,
        `Status inválido. Use: ${STATUS_VALIDOS.join(', ')}.`,
      );
    }

    const { data: pedidoAtual, error: buscaError } = await supabase
      .from(PEDIDOS_TABLE)
      .select('id, status, historico, user_id')
      .eq('id', req.params.id)
      .eq('user_id', usuario.id)
      .maybeSingle();

    if (buscaError) throw buscaError;

    if (!pedidoAtual) {
      throw new AppError(404, 'Pedido não encontrado.');
    }

    const historicoAtualizado = [
      ...(pedidoAtual.historico || []),
      { status, data: new Date().toISOString() },
    ];

    const { data, error } = await supabase
      .from(PEDIDOS_TABLE)
      .update({ status, historico: historicoAtualizado })
      .eq('id', req.params.id)
      .eq('user_id', usuario.id)
      .select('*')
      .single();

    if (error) throw error;

    return res.json(data);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
