import { useCurrency } from '../contexts/CurrencyContext';
export default function CurrencySelector() {
  const context = useCurrency();
  if (!context) return null;
  return <label title={context.error || 'Moeda de exibição; cobrança em BRL'}>Moeda
    <select aria-label="Moeda de exibição" value={context.preference} onChange={e => context.setCurrency(e.target.value)}>
      <option value="auto">Região</option>
      {context.rates.map(r => <option key={r.moeda} value={r.moeda}>{r.moeda}</option>)}
    </select>
  </label>;
}

