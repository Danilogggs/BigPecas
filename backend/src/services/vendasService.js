const { supabaseAdmin: supabase } = require('../config/supabaseClient');
const AppError = require('../utils/AppError');

const VENDAS_TABLE = process.env.SUPABASE_VENDAS_TABLE || 'vendas';
const PEDIDOS_TABLE = process.env.SUPABASE_PEDIDOS_TABLE || 'pedidos';
const PECAS_TABLE = process.env.SUPABASE_PECAS_TABLE || 'pecas';
const USERS_TABLE = process.env.SUPABASE_USER_TABLE || 'users';

function nomeUsuario(usuario) {
  return usuario?.nome_loja || usuario?.full_name || usuario?.email || 'Vendedor BigPeças';
}

function formaPagamentoTexto(formaPagamento) {
  if (typeof formaPagamento === 'string') return formaPagamento.slice(0, 100);

  const texto =
    formaPagamento?.nome ||
    formaPagamento?.label ||
    formaPagamento?.tipo ||
    formaPagamento?.id ||
    'Não informado';

  return String(texto).slice(0, 100);
}

function dataDoStatus(pedido, status) {
  const evento = (pedido.historico || []).findLast?.((item) => item?.status === status);
  return evento?.data || null;
}

async function resolverItens(pedido) {
  const itens = Array.isArray(pedido.itens) ? pedido.itens : [];
  const pecaIds = [...new Set(itens.map((item) => item?.id).filter(Boolean).map(String))];

  const pecasPorId = new Map();
  if (pecaIds.length) {
    const { data, error } = await supabase
      .from(PECAS_TABLE)
      .select('id, nome_peca, preco, imagem, sku, fornecedor_id')
      .in('id', pecaIds);

    if (error) throw error;
    (data || []).forEach((peca) => pecasPorId.set(String(peca.id), peca));
  }

  const fornecedorIds = [...new Set(itens
    .map((item) => item?.fornecedor_id ?? pecasPorId.get(String(item?.id))?.fornecedor_id)
    .filter(Boolean)
    .map(String))];
  const fornecedoresPorId = new Map();

  if (fornecedorIds.length) {
    const { data, error } = await supabase
      .from(USERS_TABLE)
      .select('id, email, full_name, nome_loja')
      .in('id', fornecedorIds);

    if (error) throw error;
    (data || []).forEach((usuario) => fornecedoresPorId.set(String(usuario.id), usuario));
  }

  return itens.map((item, itemIndice) => {
    const peca = pecasPorId.get(String(item?.id));
    const fornecedorId = item?.fornecedor_id ?? peca?.fornecedor_id;

    if (!peca?.id || !fornecedorId) {
      throw new AppError(409, 'Não foi possível vincular um item do pedido à venda correspondente.');
    }

    return {
      ...item,
      id: peca.id,
      nome: item?.nome || peca.nome_peca || 'Peça',
      preco: Number(item?.preco ?? peca.preco ?? 0),
      quantidade: Number(item?.quantidade || 1),
      imagem: item?.imagem || peca.imagem || null,
      sku: item?.sku || peca.sku || null,
      fornecedor_id: fornecedorId,
      fornecedor_nome:
        item?.fornecedor_nome || nomeUsuario(fornecedoresPorId.get(String(fornecedorId))),
      item_indice: itemIndice,
    };
  });
}

function montarLinhaVenda(pedido, item) {
  const formaPagamento = pedido.forma_pagamento || {};
  const precoUnitario = Number(item.preco || 0);
  const quantidade = Number(item.quantidade || 1);

  return {
    pedido_id: pedido.id,
    item_indice: item.item_indice,
    peca_id: item.id,
    fornecedor_id: item.fornecedor_id,
    comprador_id: pedido.user_id,
    quantidade,
    preco_unitario: precoUnitario,
    preco_total: precoUnitario * quantidade,
    forma_pagamento: formaPagamentoTexto(formaPagamento),
    parcelado: Boolean(formaPagamento.parcelado || Number(formaPagamento.numero_parcelas) > 1),
    numero_parcelas: Number(formaPagamento.numero_parcelas || 1),
    primeira_parcela_data: formaPagamento.primeira_parcela_data || null,
    juros_percentual: Number(formaPagamento.juros_percentual || 0),
    status: pedido.status,
    data_entrega: pedido.status === 'entregue' ? dataDoStatus(pedido, 'entregue') : null,
    cancelled_at: pedido.status === 'cancelado' ? dataDoStatus(pedido, 'cancelado') : null,
  };
}

async function garantirVendasDoPedido(pedido) {
  const itensResolvidos = await resolverItens(pedido);
  if (!itensResolvidos.length) return { ...pedido, itens: [] };

  const linhas = itensResolvidos.map((item) => montarLinhaVenda(pedido, item));
  const { data: vendas, error: vendasError } = await supabase
    .from(VENDAS_TABLE)
    .upsert(linhas, { onConflict: 'pedido_id,item_indice' })
    .select('id, pedido_id, item_indice');

  if (vendasError) throw vendasError;

  const vendasPorIndice = new Map(
    (vendas || []).map((venda) => [Number(venda.item_indice), venda]),
  );
  const itensAtualizados = itensResolvidos.map((item) => ({
    ...item,
    venda_id: vendasPorIndice.get(item.item_indice)?.id || item.venda_id || null,
  }));

  const precisaAtualizarPedido = itensAtualizados.some((item, indice) =>
    String(item.venda_id || '') !== String(pedido.itens?.[indice]?.venda_id || '') ||
    String(item.fornecedor_id || '') !== String(pedido.itens?.[indice]?.fornecedor_id || ''),
  );

  if (precisaAtualizarPedido) {
    const itensPersistidos = itensAtualizados.map(({ item_indice, ...item }) => item);
    const { error } = await supabase
      .from(PEDIDOS_TABLE)
      .update({ itens: itensPersistidos })
      .eq('id', pedido.id);

    if (error) throw error;
  }

  return {
    ...pedido,
    itens: itensAtualizados.map(({ item_indice, ...item }) => item),
  };
}

async function sincronizarStatusVendas(pedido) {
  const alteracoes = { status: pedido.status };

  if (pedido.status === 'entregue') {
    alteracoes.data_entrega = dataDoStatus(pedido, 'entregue') || new Date().toISOString();
  }

  if (pedido.status === 'cancelado') {
    alteracoes.cancelled_at = dataDoStatus(pedido, 'cancelado') || new Date().toISOString();
  }

  const { error } = await supabase
    .from(VENDAS_TABLE)
    .update(alteracoes)
    .eq('pedido_id', pedido.id);

  if (error) throw error;
}

module.exports = {
  garantirVendasDoPedido,
  sincronizarStatusVendas,
};
