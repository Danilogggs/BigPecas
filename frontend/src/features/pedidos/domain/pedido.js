export const ORDER_STATUS = Object.freeze({
  AGUARDANDO_PAGAMENTO: 'aguardando_pagamento',
  PAGO: 'pago',
  ENVIADO: 'enviado',
  ENTREGUE: 'entregue',
  CANCELADO: 'cancelado',
});

export const STATUS_META = Object.freeze({
  [ORDER_STATUS.AGUARDANDO_PAGAMENTO]: Object.freeze({
    label: 'Aguardando pagamento',
    color: '#92400E',
    bg: '#FEF3C7',
    border: '#FCD34D',
    icone: '⏳',
    descricao: 'Pedido criado e aguardando a confirmação do pagamento.',
    ordem: 1,
  }),
  [ORDER_STATUS.PAGO]: Object.freeze({
    label: 'Pago',
    color: '#1D4ED8',
    bg: '#DBEAFE',
    border: '#93C5FD',
    icone: '💳',
    descricao: 'Pagamento confirmado. Pedido em preparação para envio.',
    ordem: 2,
  }),
  [ORDER_STATUS.ENVIADO]: Object.freeze({
    label: 'Enviado',
    color: '#6D28D9',
    bg: '#EDE9FE',
    border: '#C4B5FD',
    icone: '🚚',
    descricao: 'Pedido despachado. Acompanhe pelo código de rastreio.',
    ordem: 3,
  }),
  [ORDER_STATUS.ENTREGUE]: Object.freeze({
    label: 'Entregue',
    color: '#065F46',
    bg: '#D1FAE5',
    border: '#6EE7B7',
    icone: '📦',
    descricao: 'Pedido entregue ao destinatário.',
    ordem: 4,
  }),
  [ORDER_STATUS.CANCELADO]: Object.freeze({
    label: 'Cancelado',
    color: '#991B1B',
    bg: '#FEE2E2',
    border: '#FCA5A5',
    icone: '×',
    descricao: 'Pedido cancelado.',
    ordem: 5,
  }),
});

export function normalizarPedido(pedido, visaoPadrao = 'compra') {
  if (!pedido) return null;

  return {
    ...pedido,
    visao: pedido.visao || visaoPadrao,
    itens: Array.isArray(pedido.itens) ? pedido.itens : [],
    historico: Array.isArray(pedido.historico) ? pedido.historico : [],
    criadoEm: pedido.criadoEm || pedido.criado_em,
    codigoRastreio: pedido.codigoRastreio || pedido.codigo_rastreio,
    valorFrete: Number(pedido.valorFrete ?? pedido.valor_frete ?? 0),
    valorTransacao: Number(
      pedido.valor_transacao ?? pedido.valor_venda ?? pedido.total ?? 0,
    ),
  };
}

export function obterNomeItem(item) {
  return item?.nome || item?.nome_peca || 'Peça';
}

export function obterDataPedido(pedido) {
  return pedido?.criadoEm || pedido?.criado_em;
}

export function obterValorPedido(pedido) {
  return Number(
    pedido?.valorTransacao ??
    pedido?.valor_transacao ??
    pedido?.valor_venda ??
    pedido?.total ??
    0,
  );
}

export function filtrarPedidosPorStatus(pedidos, status) {
  if (status === 'todos') return pedidos;
  return pedidos.filter((pedido) => pedido.status === status);
}

export function resumirPedidos(pedidos) {
  return {
    quantidade: pedidos.length,
    valor: pedidos.reduce((total, pedido) => total + obterValorPedido(pedido), 0),
    concluidos: pedidos.filter((pedido) => pedido.status === ORDER_STATUS.ENTREGUE).length,
  };
}
