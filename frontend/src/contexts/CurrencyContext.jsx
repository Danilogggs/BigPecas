import { createContext, useContext, useEffect, useState } from 'react';
import { useLanguage } from './LanguageContext';
import { API_BASE_URL } from '../services/apiConfig';
const Context = createContext(null);
export function CurrencyProvider({ children }) {
  const { language } = useLanguage();
  const [rates, setRates] = useState([{ moeda: 'BRL', unidades_por_brl: 1 }]);
  const [preference, setPreference] = useState(() => localStorage.getItem('bigpecas-currency') || 'auto');
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    fetch(API_BASE_URL + '/moeda/config').then(async r => {
      if (!r.ok) throw new Error('Conversão indisponível; preços exibidos em BRL.');
      const data = await r.json(); if (active) setRates(data);
    }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, []);
  const regional = language === 'FR' ? 'EUR' : language === 'EN' ? 'USD' : 'BRL';
  const desired = preference === 'auto' ? regional : preference;
  const currency = rates.some(r => r.moeda === desired) ? desired : 'BRL';
  const locale = language === 'FR' ? 'fr-FR' : language === 'EN' ? 'en-US' : 'pt-BR';
  const convert = (value, from = 'BRL', to = currency) => {
    const source = rates.find(r => r.moeda === from), target = rates.find(r => r.moeda === to);
    if (!source || !target || !Number.isFinite(Number(value))) return null;
    return Number(value) / Number(source.unidades_por_brl) * Number(target.unidades_por_brl);
  };
  const format = (value, from = 'BRL') => {
    const converted = convert(value, from);
    return converted == null ? 'Conversão indisponível' : new Intl.NumberFormat(locale, { style: 'currency', currency }).format(converted);
  };
  return <Context.Provider value={{ currency, rates, preference, error, format, convert,
    setCurrency: value => { localStorage.setItem('bigpecas-currency', value); setPreference(value); } }}>
    {children}
  </Context.Provider>;
}
export function useCurrency() { return useContext(Context); }

