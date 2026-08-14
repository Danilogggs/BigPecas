const express = require('express');

const { supabaseAdmin: supabase } = require('../config/supabaseClient');
const {
  garantirVendasDoPedido,
  sincronizarStatusVendas,
} = require('../services/vendasService');
const AppError = require('../utils/AppError');

const router = express.Router();
const PEDIDOS_TABLE = process.env.SUPABASE_PEDIDOS_TABLE || 'pedidos';
const PECAS_TABLE = process.env.SUPABASE_PECAS_TABLE || 'pecas';
const USERS_TABLE = process.env.SUPABASE_USER_TABLE || 'users';

const STATUS_VALIDOS = [
  'aguardando_pagamento',
  'pago',
  'enviado',
  'entregue',
  'cancelado',
];

const TRANSICOES_STATUS = {
  aguardando_pagamento: ['pago', 'cancelado'],
  pago: ['enviado', 'cancelado'],
  enviado: ['entregue'],
  entregue: [],
  cancelado: [],
};

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

function nomeUsuario(usuario) {
  return usuario?.nome_loja || usuario?.full_name || usuario?.email || 'Usuário BigPeças';
}

function calcularValorItens(itens = []) {
  return itens.reduce(
    (total, item) => total + Number(item.preco || 0) * Number(item.quantidade || 1),
    0,
  );
}

async function obterUsuarioAtual(req) {
  const email = req.user?.email || req.user?.user?.email || null;

  if (!email) {
    throw new AppError(401, 'Não foi possível identificar o usuário autenticado.');
  }

  const { data, error } = await supabase
    .from(USERS_TABLE)
    .select('id, email, full_name, nome_loja, tipo_usuario')
    .eq('email', email)
    .maybeSingle();

  if (error) throw error;

  if (!data?.id) {
    throw new AppError(404, 'Usuário não encontrado.');
  }

  return data;
}

async function buscarPecasPorIds(ids) {
  const idsUnicos = [...new Set(ids.filter((id) => id !== null && id !== undefined).map(String))];
  if (idsUnicos.length === 0) return new Map();

  const { data, error } = await supabase
    .from(PECAS_TABLE)
    .select('id, nome_peca, preco, imagem, sku, estoque_atual, fornecedor_id')
    .in('id', idsUnicos);

  if (error) throw error;
  return new Map((data || []).map((peca) => [String(peca.id), peca]));
}

async function buscarUsuariosPorIds(ids) {
  const idsUnicos = [...new Set(ids.filter(Boolean).map(String))];
  if (idsUnicos.length === 0) return new Map();

  const { data, error } = await supabase
    .from(USERS_TABLE)
    .select('id, email, full_name, nome_loja')
    .in('id', idsUnicos);

  if (error) throw error;
  return new Map((data || []).map((usuario) => [String(usuario.id), usuario]));
}

async function resolverItensDosPedidos(pedidos) {
  const idsPecas = pedidos.flatMap((pedido) =>
    Array.isArray(pedido.itens) ? pedido.itens.map((item) => item?.id) : [],
  );
  const pecasPorId = await buscarPecasPorIds(idsPecas);

  const fornecedorIds = [];
  const pedidosResolvidos = pedidos.map((pedido) => ({
    ...pedido,
    itens: (Array.isArray(pedido.itens) ? pedido.itens : []).map((item) => {
      const peca = pecasPorId.get(String(item.id));
      const fornecedorId = item.fornecedor_id ?? peca?.fornecedor_id ?? null;
      if (fornecedorId) fornecedorIds.push(fornecedorId);

      return {
        ...item,
        nome: item.nome || peca?.nome_peca || 'Peça',
        preco: Number(item.preco ?? peca?.preco ?? 0),
        quantidade: Number(item.quantidade || 1),
        imagem: item.imagem || peca?.imagem || null,
        sku: item.sku || peca?.sku || null,
        fornecedor_id: fornecedorId,
      };
    }),
  }));

  const fornecedoresPorId = await buscarUsuariosPorIds(fornecedorIds);

  return pedidosResolvidos.map((pedido) => ({
    ...pedido,
    itens: pedido.itens.map((item) => ({
      ...item,
      fornecedor_nome:
        item.fornecedor_nome || nomeUsuario(fornecedoresPorId.get(String(item.fornecedor_id))),
    })),
  }));
}

function montarCompra(pedido) {
  return {
    ...pedido,
    visao: 'compra',
    valor_transacao: Number(pedido.total || 0),
    pode_atualizar_status: false,
  };
}

function montarVenda(pedido, fornecedorId, compradoresPorId) {
  const itensVenda = pedido.itens.filter(
    (item) => String(item.fornecedor_id) === String(fornecedorId),
  );

  if (itensVenda.length === 0) return null;

  const comprador = compradoresPorId.get(String(pedido.user_id));
  const valorVenda = calcularValorItens(itensVenda);

  return {
    id: pedido.id,
    user_id: pedido.user_id,
    status: pedido.status,
    itens: itensVenda,
    endereco: pedido.endereco,
    frete: pedido.frete,
    codigo_rastreio: pedido.codigo_rastreio,
    historico: pedido.historico || [],
    criado_em: pedido.criado_em,
    valor_venda: valorVenda,
    valor_transacao: valorVenda,
    total: valorVenda,
    subtotal: valorVenda,
    total_pedido: Number(pedido.total || 0),
    comprador: comprador
      ? { id: comprador.id, nome: nomeUsuario(comprador) }
      : { id: pedido.user_id, nome: 'Cliente BigPeças' },
    visao: 'venda',
    pode_atualizar_status: true,
  };
}

async function carregarHistorico(usuario) {
  const { data, error } = await supabase
    .from(PEDIDOS_TABLE)
    .select('*')
    .order('criado_em', { ascending: false });

  if (error) throw error;

  const pedidos = await resolverItensDosPedidos(data || []);
  const compras = pedidos
    .filter((pedido) => String(pedido.user_id) === String(usuario.id))
    .map(montarCompra);

  const pedidosComVenda = pedidos.filter((pedido) =>
    pedido.itens.some((item) => String(item.fornecedor_id) === String(usuario.id)),
  );
  const compradoresPorId = await buscarUsuariosPorIds(
    pedidosComVenda.map((pedido) => pedido.user_id),
  );
  const vendas = pedidosComVenda
    .map((pedido) => montarVenda(pedido, usuario.id, compradoresPorId))
    .filter(Boolean);

  return {
    perfil: {
      id: usuario.id,
      tipo_usuario: 'ambos',
      pode_vender: true,
    },
    compras,
    vendas,
  };
}

async function enriquecerItensDoNovoPedido(itens) {
  const pecasPorId = await buscarPecasPorIds(itens.map((item) => item?.id));

  const pecasFaltantes = itens.filter((item) => !pecasPorId.has(String(item?.id)));
  if (pecasFaltantes.length > 0) {
    throw new AppError(400, 'Uma ou mais peças do pedido não estão mais disponíveis.');
  }

  const fornecedorIds = [...new Set(
    [...pecasPorId.values()].map((peca) => peca.fornecedor_id).filter(Boolean),
  )];
  const fornecedoresPorId = await buscarUsuariosPorIds(fornecedorIds);

  return itens.map((item) => {
    const peca = pecasPorId.get(String(item.id));
    const quantidade = Number(item.quantidade);

    if (!peca.fornecedor_id) {
      throw new AppError(409, `A peça ${peca.nome_peca} não possui um fornecedor vinculado.`);
    }

    if (!Number.isInteger(quantidade) || quantidade < 1) {
      throw new AppError(400, 'Informe uma quantidade válida para cada peça.');
    }

    if (quantidade > Number(peca.estoque_atual || 0)) {
      throw new AppError(409, `Estoque insuficiente para a peça ${peca.nome_peca}.`);
    }

    return {
      id: peca.id,
      nome: peca.nome_peca,
      preco: Number(peca.preco || 0),
      quantidade,
      imagem: peca.imagem || null,
      sku: peca.sku || null,
      fornecedor_id: peca.fornecedor_id,
      fornecedor_nome: nomeUsuario(fornecedoresPorId.get(String(peca.fornecedor_id))),
    };
  });
}

// Histórico completo: compras do cliente e vendas do fornecedor.
router.get('/historico', async (req, res, next) => {
  try {
    const usuario = await obterUsuarioAtual(req);
    return res.json(await carregarHistorico(usuario));
  } catch (error) {
    return next(error);
  }
});

// Compatibilidade: lista apenas as compras do usuário autenticado.
router.get('/', async (req, res, next) => {
  try {
    const usuario = await obterUsuarioAtual(req);
    const historico = await carregarHistorico(usuario);
    return res.json(historico.compras);
  } catch (error) {
    return next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const usuario = await obterUsuarioAtual(req);
    const { data, error } = await supabase
      .from(PEDIDOS_TABLE)
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new AppError(404, 'Pedido não encontrado.');

    const [pedido] = await resolverItensDosPedidos([data]);
    const querVenda = ['venda', 'vendas'].includes(String(req.query.visao || '').toLowerCase());

    if (!querVenda && String(pedido.user_id) === String(usuario.id)) {
      return res.json(montarCompra(pedido));
    }

    const compradoresPorId = await buscarUsuariosPorIds([pedido.user_id]);
    const venda = montarVenda(pedido, usuario.id, compradoresPorId);
    if (venda) return res.json(venda);

    throw new AppError(404, 'Pedido não encontrado.');
  } catch (error) {
    return next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const usuario = await obterUsuarioAtual(req);
    const { itens, frete, cupom, endereco, forma_pagamento } = req.body;

    if (!Array.isArray(itens) || itens.length === 0) {
      throw new AppError(400, 'O pedido deve conter ao menos um item.');
    }
    if (!endereco) throw new AppError(400, 'Endereço de entrega é obrigatório.');
    if (!forma_pagamento) throw new AppError(400, 'Forma de pagamento é obrigatória.');

    const itensEnriquecidos = await enriquecerItensDoNovoPedido(itens);
    const subtotal = calcularValorItens(itensEnriquecidos);
    let desconto = 0;
    let valor_frete = Number(frete?.valor || 0);

    if (cupom) {
      if (cupom.tipo === 'percentual') desconto = subtotal * Number(cupom.valor || 0);
      if (cupom.tipo === 'frete_gratis') {
        desconto = valor_frete;
        valor_frete = 0;
      }
    }

    const agora = new Date().toISOString();
    const novoPedido = {
      id: gerarNumeroPedido(),
      user_id: usuario.id,
      status: 'aguardando_pagamento',
      itens: itensEnriquecidos,
      frete,
      cupom: cupom || null,
      endereco,
      forma_pagamento,
      subtotal,
      desconto,
      valor_frete,
      total: Math.max(0, subtotal - desconto + valor_frete),
      codigo_rastreio: gerarCodigoRastreio(),
      historico: [{ status: 'aguardando_pagamento', data: agora }],
      criado_em: agora,
    };

    const { data, error } = await supabase
      .from(PEDIDOS_TABLE)
      .insert(novoPedido)
      .select('*')
      .single();

    if (error) throw error;

    const pedidoComVendas = await garantirVendasDoPedido(data);
    return res.status(201).json(montarCompra(pedidoComVendas));
  } catch (error) {
    return next(error);
  }
});

// Apenas um fornecedor envolvido no pedido pode avançar seu status.
router.patch('/:id/status', async (req, res, next) => {
  try {
    const usuario = await obterUsuarioAtual(req);
    const { status } = req.body;

    if (!status || !STATUS_VALIDOS.includes(status)) {
      throw new AppError(400, `Status inválido. Use: ${STATUS_VALIDOS.join(', ')}.`);
    }

    const { data: pedidoAtual, error: buscaError } = await supabase
      .from(PEDIDOS_TABLE)
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (buscaError) throw buscaError;
    if (!pedidoAtual) throw new AppError(404, 'Pedido não encontrado.');

    const [pedidoResolvido] = await resolverItensDosPedidos([pedidoAtual]);
    const fornecedorEnvolvido = pedidoResolvido.itens.some(
      (item) => String(item.fornecedor_id) === String(usuario.id),
    );
    const compradorDoPedido = String(pedidoResolvido.user_id) === String(usuario.id);
    const compradorConfirmandoPagamento =
      status === 'pago' &&
      pedidoAtual.status === 'aguardando_pagamento' &&
      compradorDoPedido;

    if (status === 'entregue' && !compradorDoPedido) {
      throw new AppError(403, 'Somente o comprador pode confirmar o recebimento do pedido.');
    }

    if (status !== 'entregue' && !fornecedorEnvolvido && !compradorConfirmandoPagamento) {
      throw new AppError(403, 'Somente um fornecedor deste pedido pode atualizar este status.');
    }

    const transicoesPermitidas = TRANSICOES_STATUS[pedidoAtual.status] || [];
    if (!transicoesPermitidas.includes(status)) {
      throw new AppError(409, 'Essa alteração de status não é permitida para o pedido atual.');
    }

    const historicoAtualizado = [
      ...(pedidoAtual.historico || []),
      { status, data: new Date().toISOString() },
    ];

    const { data, error } = await supabase
      .from(PEDIDOS_TABLE)
      .update({ status, historico: historicoAtualizado })
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error) throw error;

    const [pedidoResolvidoAtualizado] = await resolverItensDosPedidos([data]);
    const pedidoAtualizado = await garantirVendasDoPedido(pedidoResolvidoAtualizado);
    await sincronizarStatusVendas(pedidoAtualizado);

    if (compradorDoPedido) {
      return res.json(montarCompra(pedidoAtualizado));
    }

    const compradoresPorId = await buscarUsuariosPorIds([pedidoAtualizado.user_id]);
    return res.json(montarVenda(pedidoAtualizado, usuario.id, compradoresPorId));
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
