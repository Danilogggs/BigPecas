import { useCurrency } from '../contexts/CurrencyContext';
export default function Money({ value, currency = 'BRL' }) {
  const context = useCurrency();
  return <>{context ? context.format(value, currency) : new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(Number(value))}</>;
}

