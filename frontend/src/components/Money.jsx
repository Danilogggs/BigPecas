import { useMoney } from '../contexts/CurrencyContext';

/** Valor monetario convertido para a moeda do usuario e formatado no locale ativo. */
export default function Money({ value, currency = 'BRL' }) {
  const formatMoney = useMoney();
  return <>{formatMoney(value, currency || 'BRL')}</>;
}

