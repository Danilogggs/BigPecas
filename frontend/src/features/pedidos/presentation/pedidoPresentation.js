import { ORDER_STATUS, STATUS_META } from '../domain/pedido';
import { formatCurrency } from '../../../utils/intl';

// Valor em BRL formatado no locale do idioma ativo. Componentes React usam
// useBrlMoney(), que acompanha a troca de idioma.
export const formatarMoeda = (valor, locale) => formatCurrency(valor, 'BRL', locale);

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

  // Rotulo e descricao vem do dominio em portugues e sao traduzidos aqui.
  if (meta) return { ...meta, label: traduzir(labels[status]), descricao: traduzir(meta.descricao) };
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
