import i18n from 'i18next';

// Ponto unico de internacionalizacao de formatos: datas, numeros e moedas sao
// sempre formatados com o locale do idioma ativo (PTBR -> pt-BR, EN -> en-US,
// FR -> fr-FR), nunca com um locale fixo no componente.
export const LOCALE_BY_LANGUAGE = Object.freeze({
  PTBR: 'pt-BR',
  EN: 'en-US',
  FR: 'fr-FR',
});

// Moeda "regional" sugerida para cada idioma quando o usuario deixa a
// preferencia de moeda em automatico.
export const CURRENCY_BY_LANGUAGE = Object.freeze({
  PTBR: 'BRL',
  EN: 'USD',
  FR: 'EUR',
});

export const DEFAULT_LOCALE = LOCALE_BY_LANGUAGE.PTBR;

export function localeFor(language) {
  return LOCALE_BY_LANGUAGE[language] || DEFAULT_LOCALE;
}

export function regionalCurrencyFor(language) {
  return CURRENCY_BY_LANGUAGE[language] || CURRENCY_BY_LANGUAGE.PTBR;
}

/** Locale do idioma atualmente ativo no i18next. */
export function currentLocale() {
  return localeFor(i18n.language);
}

function toDate(value) {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Formata data/hora no locale informado; devolve '' para valores invalidos. */
export function formatDateTime(value, options = {}, locale = currentLocale()) {
  const date = toDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat(locale, options).format(date);
}

/** Formata numeros (separador decimal e de milhar dependem do locale). */
export function formatNumber(value, options = {}, locale = currentLocale()) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '';
  return new Intl.NumberFormat(locale, options).format(number);
}

/** Formata percentuais a partir de um valor em pontos percentuais (ex.: 12.5 -> "12,5%"). */
export function formatPercent(value, options = {}, locale = currentLocale()) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '';
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 1,
    ...options,
  }).format(number / 100);
}

/** Formata um valor monetario sem conversao de cambio. */
export function formatCurrency(value, currency = 'BRL', locale = currentLocale()) {
  const number = Number(value || 0);
  return new Intl.NumberFormat(locale, { style: 'currency', currency })
    .format(Number.isFinite(number) ? number : 0);
}
