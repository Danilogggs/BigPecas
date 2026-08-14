const express = require('express');

const { supabaseAdmin: supabase } = require('../config/supabaseClient');
const { garantirVendasDoPedido } = require('../services/vendasService');
const AppError = require('../utils/AppError');

const router = express.Router();
const PEDIDOS_TABLE = process.env.SUPABASE_PEDIDOS_TABLE || 'pedidos';
const USERS_TABLE = process.env.SUPABASE_USER_TABLE || 'users';
const AVALIACOES_FORNECEDOR_TABLE =
  process.env.SUPABASE_AVALIACOES_FORNECEDOR_TABLE || 'avaliacoes_fornecedor';
const AVALIACOES_PRODUTO_TABLE =
  process.env.SUPABASE_AVALIACOES_PRODUTO_TABLE || 'avaliacoes_produto';

function media(lista, campo) {
  if (!lista.length) return 0;
  const total = lista.reduce((soma, item) => soma + Number(item[campo] || 0), 0);
  return Number((total / lista.length).toFixed(1));
}

function resumoAvaliacoes(avaliacoes) {
  return {
    total: avaliacoes.length,
    media: media(avaliacoes, 'nota'),
  };
}

function validarNota(valor, campo = 'nota') {
  const nota = Number(valor);
  if (!Number.isInteger(nota) || nota < 1 || nota > 5) {
    throw new AppError(400, `${campo} deve ser um número inteiro entre 1 e 5.`);
  }
  return nota;
}

function normalizarComentario(valor) {
  const comentario = String(valor || '').trim();
  if (comentario.length > 1000) {
    throw new AppError(400, 'O comentário deve ter no máximo 1000 caracteres.');
  }
  return comentario || null;
}

async function obterUsuarioAtual(req) {
  const email = req.user?.email || req.user?.user?.email;
  if (!email) throw new AppError(401, 'Não foi possível identificar o usuário autenticado.');

  const { data, error } = await supabase
    .from(USERS_TABLE)
    .select('id, email, full_name, nome_loja')
    .eq('email', email)
    .maybeSingle();

  if (error) throw error;
  if (!data?.id) throw new AppError(404, 'Usuário não encontrado.');
  return data;
}

async function carregarCompra(pedidoId, compradorId) {
  const { data, error } = await supabase
    .from(PEDIDOS_TABLE)
    .select('*')
    .eq('id', pedidoId)
    .maybeSingle();

  if (error) throw error;
  if (!data || String(data.user_id) !== String(compradorId)) {
    throw new AppError(404, 'Compra não encontrada.');
  }

  return garantirVendasDoPedido(data);
}

function validarCompraEntregue(pedido) {
  if (pedido.status !== 'entregue') {
    throw new AppError(
      409,
      'A avaliação só é liberada após o comprador confirmar o recebimento do pedido.',
    );
  }
}

function agruparFornecedores(pedido) {
  const fornecedores = new Map();

  pedido.itens.forEach((item) => {
    const chave = String(item.fornecedor_id);
    if (!fornecedores.has(chave)) {
      fornecedores.set(chave, {
        fornecedor_id: item.fornecedor_id,
        fornecedor_nome: item.fornecedor_nome || 'Vendedor BigPeças',
        venda_id: item.venda_id,
        venda_ids: [],
      });
    }
    fornecedores.get(chave).venda_ids.push(item.venda_id);
  });

  return [...fornecedores.values()];
}

async function montarEstadoAvaliacoes(pedido, compradorId) {
  const [{ data: fornecedores, error: fornecedorError }, { data: produtos, error: produtoError }] =
    await Promise.all([
      supabase
        .from(AVALIACOES_FORNECEDOR_TABLE)
        .select('*')
        .eq('pedido_id', pedido.id)
        .eq('comprador_id', compradorId),
      supabase
        .from(AVALIACOES_PRODUTO_TABLE)
        .select('*')
        .eq('pedido_id', pedido.id)
        .eq('comprador_id', compradorId),
    ]);

  if (fornecedorError) throw fornecedorError;
  if (produtoError) throw produtoError;

  const fornecedorPorId = new Map(
    (fornecedores || []).map((avaliacao) => [String(avaliacao.fornecedor_id), avaliacao]),
  );
  const produtoPorVenda = new Map(
    (produtos || []).map((avaliacao) => [String(avaliacao.venda_id), avaliacao]),
  );

  return {
    pedido_id: pedido.id,
    status: pedido.status,
    liberada: pedido.status === 'entregue',
    motivo_bloqueio:
      pedido.status === 'entregue'
        ? null
        : 'Confirme o recebimento do pedido para avaliar o vendedor e os produtos.',
    fornecedores: agruparFornecedores(pedido).map((fornecedor) => ({
      ...fornecedor,
      avaliado: fornecedorPorId.has(String(fornecedor.fornecedor_id)),
      avaliacao: fornecedorPorId.get(String(fornecedor.fornecedor_id)) || null,
    })),
    produtos: pedido.itens.map((item) => ({
      peca_id: item.id,
      venda_id: item.venda_id,
      nome: item.nome || item.nome_peca || 'Peça',
      imagem: item.imagem || null,
      fornecedor_id: item.fornecedor_id,
      fornecedor_nome: item.fornecedor_nome || 'Vendedor BigPeças',
      avaliado: produtoPorVenda.has(String(item.venda_id)),
      avaliacao: produtoPorVenda.get(String(item.venda_id)) || null,
    })),
  };
}

router.get('/pedidos/:pedidoId', async (req, res, next) => {
  try {
    const usuario = await obterUsuarioAtual(req);
    const pedido = await carregarCompra(req.params.pedidoId, usuario.id);
    return res.json(await montarEstadoAvaliacoes(pedido, usuario.id));
  } catch (error) {
    return next(error);
  }
});

router.post('/fornecedores', async (req, res, next) => {
  try {
    const usuario = await obterUsuarioAtual(req);
    const pedido = await carregarCompra(req.body.pedido_id, usuario.id);
    validarCompraEntregue(pedido);

    const fornecedor = agruparFornecedores(pedido).find(
      (item) => String(item.fornecedor_id) === String(req.body.fornecedor_id),
    );

    if (!fornecedor?.venda_id) {
      throw new AppError(400, 'O vendedor informado não pertence a esta compra.');
    }

    const { data: existente, error: existenteError } = await supabase
      .from(AVALIACOES_FORNECEDOR_TABLE)
      .select('id')
      .eq('pedido_id', pedido.id)
      .eq('fornecedor_id', fornecedor.fornecedor_id)
      .eq('comprador_id', usuario.id)
      .maybeSingle();

    if (existenteError) throw existenteError;
    if (existente) throw new AppError(409, 'Este vendedor já foi avaliado nesta compra.');

    const payload = {
      pedido_id: pedido.id,
      fornecedor_id: fornecedor.fornecedor_id,
      comprador_id: usuario.id,
      venda_id: fornecedor.venda_id,
      nota: validarNota(req.body.nota),
      comentario: normalizarComentario(req.body.comentario),
      qualidade_peca: validarNota(req.body.qualidade_peca, 'qualidade da peça'),
      comunicacao: validarNota(req.body.comunicacao, 'comunicação'),
      rapidez_entrega: validarNota(req.body.rapidez_entrega, 'rapidez da entrega'),
      embalagem: validarNota(req.body.embalagem, 'embalagem'),
      verificada: true,
      data_avaliacao: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from(AVALIACOES_FORNECEDOR_TABLE)
      .insert(payload)
      .select('*')
      .single();

    if (error?.code === '23505') {
      throw new AppError(409, 'Este vendedor já foi avaliado nesta compra.');
    }
    if (error) throw error;
    return res.status(201).json(data);
  } catch (error) {
    return next(error);
  }
});

router.post('/produtos', async (req, res, next) => {
  try {
    const usuario = await obterUsuarioAtual(req);
    const pedido = await carregarCompra(req.body.pedido_id, usuario.id);
    validarCompraEntregue(pedido);

    const item = pedido.itens.find((produto) =>
      req.body.venda_id
        ? String(produto.venda_id) === String(req.body.venda_id)
        : String(produto.id) === String(req.body.peca_id),
    );

    if (!item?.venda_id) {
      throw new AppError(400, 'O produto informado não pertence a esta compra.');
    }

    const { data: existente, error: existenteError } = await supabase
      .from(AVALIACOES_PRODUTO_TABLE)
      .select('id')
      .eq('pedido_id', pedido.id)
      .eq('venda_id', item.venda_id)
      .eq('comprador_id', usuario.id)
      .maybeSingle();

    if (existenteError) throw existenteError;
    if (existente) throw new AppError(409, 'Este produto já foi avaliado nesta compra.');

    const payload = {
      pedido_id: pedido.id,
      venda_id: item.venda_id,
      peca_id: item.id,
      fornecedor_id: item.fornecedor_id,
      comprador_id: usuario.id,
      nota: validarNota(req.body.nota),
      comentario: normalizarComentario(req.body.comentario),
      verificada: true,
      data_avaliacao: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from(AVALIACOES_PRODUTO_TABLE)
      .insert(payload)
      .select('*')
      .single();

    if (error?.code === '23505') {
      throw new AppError(409, 'Este produto já foi avaliado nesta compra.');
    }
    if (error) throw error;
    return res.status(201).json(data);
  } catch (error) {
    return next(error);
  }
});

router.get('/fornecedores/:fornecedorId', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from(AVALIACOES_FORNECEDOR_TABLE)
      .select('id, nota, comentario, qualidade_peca, comunicacao, rapidez_entrega, embalagem, data_avaliacao')
      .eq('fornecedor_id', req.params.fornecedorId)
      .eq('verificada', true)
      .order('data_avaliacao', { ascending: false });

    if (error) throw error;
    const avaliacoes = data || [];
    return res.json({
      resumo: {
        ...resumoAvaliacoes(avaliacoes),
        qualidade_peca: media(avaliacoes, 'qualidade_peca'),
        comunicacao: media(avaliacoes, 'comunicacao'),
        rapidez_entrega: media(avaliacoes, 'rapidez_entrega'),
        embalagem: media(avaliacoes, 'embalagem'),
      },
      avaliacoes,
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/produtos/:pecaId', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from(AVALIACOES_PRODUTO_TABLE)
      .select('id, nota, comentario, data_avaliacao')
      .eq('peca_id', req.params.pecaId)
      .eq('verificada', true)
      .order('data_avaliacao', { ascending: false });

    if (error) throw error;
    const avaliacoes = data || [];
    return res.json({ resumo: resumoAvaliacoes(avaliacoes), avaliacoes });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
