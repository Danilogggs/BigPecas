import { formatCurrency } from '../../../utils/intl';

// Valor em BRL formatado no locale do idioma ativo. Componentes React usam
// useBrlMoney(), que acompanha a troca de idioma.
export const formatarMoedaCarrinho = (valor, locale) => formatCurrency(valor, 'BRL', locale);

// Chaves de traducao das formas de pagamento (o dominio guarda textos em PT).
const CHAVES_PAGAMENTO = Object.freeze({
  pix: ['pixPayment', 'paymentApproval'],
  cartao: ['cardPayment', 'cardDescription'],
  boleto: ['bankSlip', 'bankSlipDescription'],
});

// Prazo de entrega localizado a partir dos dias informados pela API; se a API
// so mandar o texto pronto, ele e exibido como veio.
export function textoPrazoFrete(opcao, traduzir) {
  const maximo = Number(opcao?.prazo_max ?? opcao?.prazo_dias);
  if (!Number.isFinite(maximo) || maximo <= 0) return opcao?.prazo_texto || '';
  return Number(opcao.prazo_min) === 1 && maximo === 1
    ? traduzir('deliveryOneBusinessDay')
    : traduzir('deliveryUpToBusinessDays', { count: maximo });
}

export function nomeFormaPagamento(forma, traduzir) {
  const chaves = CHAVES_PAGAMENTO[forma?.id];
  return chaves ? traduzir(chaves[0]) : traduzir(forma?.nome || '');
}

export function descricaoFormaPagamento(forma, traduzir) {
  const chaves = CHAVES_PAGAMENTO[forma?.id];
  return chaves ? traduzir(chaves[1]) : traduzir(forma?.descricao || '');
}
