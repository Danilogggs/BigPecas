import { act, renderHook } from '@testing-library/react';
import { LanguageProvider, useLanguage } from '../LanguageContext';
test('exige o provider', () => {
  expect(() => renderHook(useLanguage)).toThrow();
});
test.each([['PTBR', 'pt-BR'], ['EN', 'en-US'], ['FR', 'fr-FR']])('formata datas e persiste idioma %s', (language, locale) => {
  localStorage.setItem('bigpecas-language', language);
  const { result } = renderHook(useLanguage, { wrapper: LanguageProvider });
  act(() => result.current.setLanguage(language));
  expect(result.current.language).toBe(language);
  expect(result.current.formatDate(null)).toBe('');
  expect(result.current.formatDate('not-a-date')).toBe('');
  const value = '2026-01-10T12:00:00Z';
  expect(result.current.formatDate(value, { timeZone: 'UTC' })).toBe(new Intl.DateTimeFormat(locale, { timeZone: 'UTC' }).format(new Date(value)));
  expect(result.current.formatDate(value)).toBe(new Intl.DateTimeFormat(locale).format(new Date(value)));
  expect(result.current.t('chave-inexistente')).toBe('chave-inexistente');
  expect(result.current.t('chave-inexistente', { value: 3 })).toBe('chave-inexistente');
});
test('inicia em português sem preferência salva', () => {
  const { result } = renderHook(useLanguage, { wrapper: LanguageProvider });
  expect(result.current.language).toBe('PTBR');
});
