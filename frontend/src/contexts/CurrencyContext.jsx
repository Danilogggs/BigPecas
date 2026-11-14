import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useLanguage, useOptionalLanguage } from './LanguageContext';
import { API_BASE_URL } from '../services/apiConfig';
import { currentLocale, formatCurrency, localeFor, regionalCurrencyFor } from '../utils/intl';

const Context = createContext(null);
const PREFERENCE_KEY = 'bigpecas-currency';

export function CurrencyProvider({ children }) {
  const { language, t } = useLanguage();
  const [rates, setRates] = useState([{ moeda: 'BRL', unidades_por_brl: 1 }]);
  const [preference, setPreference] = useState(() => localStorage.getItem(PREFERENCE_KEY) || 'auto');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetch(API_BASE_URL + '/moeda/config').then(async (response) => {
      if (!response.ok) throw new Error('conversionUnavailableBrl');
      const data = await response.json();
      if (active && Array.isArray(data)) setRates(data);
    }).catch(() => { if (active) setError('conversionUnavailableBrl'); });
    return () => { active = false; };
  }, []);

  const desired = preference === 'auto' ? regionalCurrencyFor(language) : preference;
  const currency = rates.some((rate) => rate.moeda === desired) ? desired : 'BRL';
  const locale = localeFor(language);

  const convert = (value, from = 'BRL', to = currency) => {
    const source = rates.find((rate) => rate.moeda === from);
    const target = rates.find((rate) => rate.moeda === to);
    if (!source || !target || !Number.isFinite(Number(value))) return null;
    return Number(value) / Number(source.unidades_por_brl) * Number(target.unidades_por_brl);
  };

  const format = (value, from = 'BRL') => {
    const converted = convert(value, from);
    return converted == null
      ? t('conversionUnavailable')
      : new Intl.NumberFormat(locale, { style: 'currency', currency }).format(converted);
  };

  return <Context.Provider value={{
    currency, rates, preference, error: error ? t(error) : '', format, convert, locale,
    setCurrency: (value) => { localStorage.setItem(PREFERENCE_KEY, value); setPreference(value); },
  }}>
    {children}
  </Context.Provider>;
}

export function useCurrency() { return useContext(Context); }

/**
 * Formatador para valores cobrados em BRL (carrinho, checkout, pedidos e
 * relatorios financeiros): a cobranca e sempre em reais, entao o valor nao e
 * convertido — apenas formatado no locale do idioma ativo (ex.: R$1,500.00 em
 * ingles, 1 500,00 R$ em frances).
 */
export function useBrlMoney() {
  const language = useOptionalLanguage()?.language;
  return useCallback(
    (value) => formatCurrency(value, 'BRL', language ? localeFor(language) : currentLocale()),
    [language],
  );
}

/**
 * Formatador monetario para componentes: converte o valor (gravado em BRL no
 * banco, por padrao) para a moeda escolhida pelo usuario e formata no locale do
 * idioma ativo. Fora do CurrencyProvider apenas formata no locale ativo.
 */
export function useMoney() {
  const context = useContext(Context);
  const language = useOptionalLanguage()?.language;
  return useCallback((value, from = 'BRL') => {
    if (context) return context.format(Number(value || 0), from);
    return formatCurrency(value, from, language ? localeFor(language) : currentLocale());
  }, [context, language]);
}
