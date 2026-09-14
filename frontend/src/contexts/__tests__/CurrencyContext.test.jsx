import { act, renderHook, waitFor } from '@testing-library/react';
import { CurrencyProvider, useCurrency } from '../CurrencyContext';
import { useLanguage } from '../LanguageContext';
jest.mock('../LanguageContext', () => ({ useLanguage: jest.fn() }));
const rates = [{ moeda: 'BRL', unidades_por_brl: 1 }, { moeda: 'USD', unidades_por_brl: .2 }, { moeda: 'EUR', unidades_por_brl: .18 }];
beforeEach(() => {
  useLanguage.mockReturnValue({ language: 'PTBR' });
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => rates });
});
test.each([['PTBR', 'BRL'], ['EN', 'USD'], ['FR', 'EUR']])('seleciona moeda regional %s', async (language, currency) => {
  useLanguage.mockReturnValue({ language });
  const { result } = renderHook(useCurrency, { wrapper: CurrencyProvider });
  await waitFor(() => expect(result.current.rates).toEqual(rates));
  expect(result.current.currency).toBe(currency);
  expect(result.current.convert(100, 'BRL', 'USD')).toBe(20);
  expect(result.current.convert('inválido')).toBeNull();
  expect(result.current.convert(1, 'ZZZ')).toBeNull();
  expect(result.current.convert(1, 'BRL', 'ZZZ')).toBeNull();
  expect(result.current.format(100)).not.toBe('Conversão indisponível');
  expect(result.current.format('inválido')).toBe('Conversão indisponível');
});
test('persiste preferência e permite voltar ao automático', async () => {
  localStorage.setItem('bigpecas-currency', 'USD');
  const { result } = renderHook(useCurrency, { wrapper: CurrencyProvider });
  await waitFor(() => expect(result.current.currency).toBe('USD'));
  act(() => result.current.setCurrency('EUR'));
  expect(localStorage.getItem('bigpecas-currency')).toBe('EUR');
  expect(result.current.currency).toBe('EUR');
  act(() => result.current.setCurrency('auto'));
  expect(result.current.currency).toBe('BRL');
});
test('mantém BRL e informa indisponibilidade do serviço', async () => {
  useLanguage.mockReturnValue({ language: 'EN' });
  fetch.mockResolvedValue({ ok: false });
  const { result } = renderHook(useCurrency, { wrapper: CurrencyProvider });
  await waitFor(() => expect(result.current.error).toMatch(/Conversão indisponível/));
  expect(result.current.currency).toBe('BRL');
  expect(result.current.convert(10)).toBe(10);
});
test.each([true, false])('ignora respostas após desmontagem (sucesso=%s)', async success => {
  let resolve;
  fetch.mockReturnValue(new Promise(r => { resolve = r; }));
  const { unmount } = renderHook(useCurrency, { wrapper: CurrencyProvider });
  unmount();
  await act(async () => resolve({ ok: success, json: async () => rates }));
});
