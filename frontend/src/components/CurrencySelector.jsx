import { useCurrency } from '../contexts/CurrencyContext';
import { useLanguage } from '../contexts/LanguageContext';
export default function CurrencySelector() {
  const context = useCurrency();
  const { t } = useLanguage();
  if (!context) return null;
  return <label className="bp-language-switcher" title={context.error || t('displayCurrencyHint')}>
    <span className="sr-only">{t('displayCurrency')}</span>
    <select aria-label={t('displayCurrency')} value={context.preference} onChange={e => context.setCurrency(e.target.value)}>
      <option value="auto">{t('region')}</option>
      {context.rates.map(r => <option key={r.moeda} value={r.moeda}>{r.moeda}</option>)}
    </select>
  </label>;
}

