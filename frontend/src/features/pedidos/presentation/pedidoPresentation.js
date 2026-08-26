import { ORDER_STATUS, STATUS_META } from '../domain/pedido';

export const formatarMoeda = (valor) =>
  Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatarDataPedido(valor, formatarData) {
  if (!valor) return '';
  return formatarData(valor, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function obterMetaStatus(status, traduzir) {
  const labels = {
    [ORDER_STATUS.AGUARDANDO_PAGAMENTO]: 'awaitingPayment',
    [ORDER_STATUS.PAGO]: 'paid',
    [ORDER_STATUS.ENVIADO]: 'shipped',
    [ORDER_STATUS.ENTREGUE]: 'delivered',
    [ORDER_STATUS.CANCELADO]: 'canceled',
  };
  const meta = STATUS_META[status];

  if (meta) return { ...meta, label: traduzir(labels[status]) };
  return {
    label: traduzir('unknownStatus'),
    color: '#4B5563',
    bg: '#F3F4F6',
    border: '#D1D5DB',
    icone: '•',
    descricao: traduzir('unknownStatusDescription'),
    ordem: 99,
  };
}
