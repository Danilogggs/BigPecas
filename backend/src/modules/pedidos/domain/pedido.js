const STATUS_PEDIDO = Object.freeze({
  AGUARDANDO_PAGAMENTO: 'aguardando_pagamento',
  PAGO: 'pago',
  ENVIADO: 'enviado',
  ENTREGUE: 'entregue',
  CANCELADO: 'cancelado',
});

const STATUS_VALIDOS = Object.freeze(Object.values(STATUS_PEDIDO));

const TRANSICOES_STATUS = Object.freeze({
  [STATUS_PEDIDO.AGUARDANDO_PAGAMENTO]: Object.freeze([
    STATUS_PEDIDO.PAGO,
    STATUS_PEDIDO.CANCELADO,
  ]),
  [STATUS_PEDIDO.PAGO]: Object.freeze([
    STATUS_PEDIDO.ENVIADO,
    STATUS_PEDIDO.CANCELADO,
  ]),
  [STATUS_PEDIDO.ENVIADO]: Object.freeze([STATUS_PEDIDO.ENTREGUE]),
  [STATUS_PEDIDO.ENTREGUE]: Object.freeze([]),
  [STATUS_PEDIDO.CANCELADO]: Object.freeze([]),
});

function statusEhValido(status) {
  return STATUS_VALIDOS.includes(status);
}

function transicaoEhPermitida(statusAtual, proximoStatus) {
  return (TRANSICOES_STATUS[statusAtual] || []).includes(proximoStatus);
}

function gerarCodigoRastreio(random = Math.random) {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const numero = String(Math.floor(random() * 1000000000)).padStart(9, '0');
  const a = letras[Math.floor(random() * letras.length)];
  const b = letras[Math.floor(random() * letras.length)];
  return `BG${numero}${a}${b}`;
}

function gerarNumeroPedido(data = new Date(), random = Math.random) {
  const ano = data.getFullYear();
  const numero = Math.floor(random() * 900000 + 100000);
  return `${ano}-${numero}`;
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

module.exports = {
  STATUS_PEDIDO,
  STATUS_VALIDOS,
  TRANSICOES_STATUS,
  calcularValorItens,
  gerarCodigoRastreio,
  gerarNumeroPedido,
  montarCompra,
  montarVenda,
  nomeUsuario,
  statusEhValido,
  transicaoEhPermitida,
};
