import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { CurrencyProvider, useBrlMoney, useCurrency, useMoney } from '../CurrencyContext';
import { LanguageProvider, useLanguage } from '../LanguageContext';

const rates = [{ moeda: 'BRL', unidades_por_brl: 1 }, { moeda: 'USD', unidades_por_brl: 0.2 }, { moeda: 'EUR', unidades_por_brl: 0.18 }];
const wrapper = ({ children }) => <LanguageProvider><CurrencyProvider>{children}</CurrencyProvider></LanguageProvider>;
const useBoth = () => ({ ...useCurrency(), lang: useLanguage(), money: useMoney() });

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => rates });
});

test.each([['PTBR', 'BRL', 'R$'], ['EN', 'USD', '$'], ['FR', 'EUR', '€']])('seleciona moeda regional e locale para %s', async (language, currency, symbol) => {
  localStorage.setItem('bigpecas-language', language);
  const { result } = renderHook(useBoth, { wrapper });
  await waitFor(() => expect(result.current.rates).toEqual(rates));
  expect(result.current.currency).toBe(currency);
  expect(result.current.convert(100, 'BRL', 'USD')).toBe(20);
  expect(result.current.convert('inválido')).toBeNull();
  expect(result.current.convert(1, 'ZZZ')).toBeNull();
  expect(result.current.convert(1, 'BRL', 'ZZZ')).toBeNull();
  expect(result.current.format(100)).toContain(symbol);
  expect(result.current.money(100)).toBe(result.current.format(100));
  expect(result.current.money(null)).toBe(result.current.format(0));
  expect(result.current.format('inválido')).toBe(result.current.lang.t('conversionUnavailable'));
});

test('formata separadores conforme o idioma', async () => {
  localStorage.setItem('bigpecas-language', 'FR');
  localStorage.setItem('bigpecas-currency', 'BRL');
  const { result } = renderHook(useBoth, { wrapper });
  await waitFor(() => expect(result.current.rates).toEqual(rates));
  expect(result.current.format(1234.5)).toMatch(/1\s?234,50/);
  act(() => result.current.lang.setLanguage('EN'));
  expect(result.current.format(1234.5)).toContain('1,234.50');
});

test('persiste preferência e permite voltar ao automático', async () => {
  localStorage.setItem('bigpecas-currency', 'USD');
  const { result } = renderHook(useCurrency, { wrapper });
  await waitFor(() => expect(result.current.currency).toBe('USD'));
  act(() => result.current.setCurrency('EUR'));
  expect(localStorage.getItem('bigpecas-currency')).toBe('EUR');
  expect(result.current.currency).toBe('EUR');
  act(() => result.current.setCurrency('auto'));
  expect(result.current.currency).toBe('BRL');
});

test('mantém BRL e informa indisponibilidade traduzida do serviço', async () => {
  localStorage.setItem('bigpecas-language', 'EN');
  fetch.mockResolvedValue({ ok: false });
  const { result } = renderHook(useCurrency, { wrapper });
  await waitFor(() => expect(result.current.error).toMatch(/unavailable/i));
  expect(result.current.currency).toBe('BRL');
  expect(result.current.convert(10)).toBe(10);
});

test('trata falha de rede e resposta que não é lista', async () => {
  fetch.mockRejectedValueOnce(new Error('offline'));
  const { result, unmount } = renderHook(useCurrency, { wrapper });
  await waitFor(() => expect(result.current.error).toMatch(/Conversão indisponível/));
  unmount();
  fetch.mockResolvedValue({ ok: true, json: async () => ({ invalido: true }) });
  const second = renderHook(useCurrency, { wrapper });
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  expect(second.result.current.rates).toEqual([{ moeda: 'BRL', unidades_por_brl: 1 }]);
});

test.each([true, false])('ignora respostas após desmontagem (sucesso=%s)', async (success) => {
  let resolve;
  fetch.mockReturnValue(new Promise((r) => { resolve = r; }));
  const { unmount } = renderHook(useCurrency, { wrapper });
  unmount();
  await act(async () => resolve({ ok: success, json: async () => rates }));
});

test('useBrlMoney nao converte, apenas formata BRL no locale do idioma', async () => {
  localStorage.setItem('bigpecas-language', 'EN');
  const { result } = renderHook(() => ({ brl: useBrlMoney(), money: useMoney() }), { wrapper });
  await waitFor(() => expect(result.current.money(100)).toBe('$20.00'));
  expect(result.current.brl(100)).toBe('R$100.00');
  function Fora() { return <span>{useBrlMoney()(5)}</span>; }
  render(<Fora />);
  expect(screen.getByText(/R\$/)).toBeInTheDocument();
});

test('useMoney funciona fora dos providers usando o locale ativo', () => {
  function Price() { return <span>{useMoney()(10)}</span>; }
  render(<Price />);
  expect(screen.getByText(/10/)).toBeInTheDocument();
  function LocalizedPrice() { return <span>{useMoney()(10, 'EUR')}</span>; }
  localStorage.setItem('bigpecas-language', 'EN');
  render(<LanguageProvider><LocalizedPrice /></LanguageProvider>);
  expect(screen.getByText('€10.00')).toBeInTheDocument();
});
