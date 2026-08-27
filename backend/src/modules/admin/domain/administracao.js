const AppError = require('../../../utils/AppError');

const WIDGETS_PADRAO = [
  'boas_vindas', 'faturamento', 'pedidos', 'ticket_medio', 'taxa_conclusao',
  'desempenho_vendas', 'requer_atencao',
  'fluxo_pedidos', 'resumo_plataforma', 'atividade_recente',
];
const WIDGETS_PERMITIDOS = new Set([
  ...WIDGETS_PADRAO, 'usuarios', 'administradores', 'pecas', 'pedidos',
  'pedidos_pendentes', 'avaliacoes', 'taxa_cancelamento',
]);
const STATUS_PEDIDO = new Set(['aguardando_pagamento', 'pago', 'enviado', 'entregue', 'cancelado']);

function inteiroPositivo(valor, padrao, maximo = Number.MAX_SAFE_INTEGER) {
  const numero = Number.parseInt(valor, 10);
  if (!Number.isInteger(numero) || numero < 1) return padrao;
  return Math.min(numero, maximo);
}

function paginacao(query = {}) {
  const page = inteiroPositivo(query.page, 1);
  const limit = inteiroPositivo(query.limit, 20, 100);
  return { page, limit, from: (page - 1) * limit, to: page * limit - 1 };
}

function validarId(valor, rotulo = 'registro') {
  if (!/^\d+$/.test(String(valor)) || Number(valor) < 1) {
    throw new AppError(400, `O id de ${rotulo} e invalido.`);
  }
  return Number(valor);
}

function validarWidgets(widgets) {
  if (!Array.isArray(widgets) || widgets.length < 1 || widgets.length > WIDGETS_PERMITIDOS.size) {
    throw new AppError(400, `Escolha entre 1 e ${WIDGETS_PERMITIDOS.size} widgets para o painel.`);
  }
  if (new Set(widgets).size !== widgets.length || widgets.some((item) => !WIDGETS_PERMITIDOS.has(item))) {
    throw new AppError(400, 'A configuracao contem widgets invalidos ou repetidos.');
  }
  return widgets;
}

function validarStatus(status) {
  if (!STATUS_PEDIDO.has(status)) throw new AppError(400, 'Status de pedido invalido.');
  return status;
}

function tabelaAvaliacao(tipo, tabelas) {
  if (tipo === 'produtos') return tabelas.avaliacoesProduto;
  if (tipo === 'fornecedores') return tabelas.avaliacoesFornecedor;
  throw new AppError(400, 'Use produtos ou fornecedores como tipo.');
}

const sanitizarBusca = (valor) => String(valor || '').trim().replace(/[,%()]/g, '');

module.exports = {
  WIDGETS_PADRAO,
  paginacao,
  sanitizarBusca,
  tabelaAvaliacao,
  validarId,
  validarStatus,
  validarWidgets,
};
