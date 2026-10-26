import { act, renderHook } from '@testing-library/react';
import { ThemeProvider, useTheme, DEFAULT_CUSTOM_THEME, ajustarContrasteTema } from '../ThemeContext';
test.each(['invalid-json', '{}', '{"primary":"red"}'])('descarta paleta inválida %s', saved => {
  localStorage.setItem('bigpecas-custom-theme', saved);
  const { result } = renderHook(useTheme, { wrapper: ThemeProvider });
  expect(result.current.customTheme).toEqual(DEFAULT_CUSTOM_THEME);
});
test.each(['#000000', '#FFFFFF'])('restaura cores e ajusta contraste %s', color => {
  const palette = { ...DEFAULT_CUSTOM_THEME, background: color, primary: color, accent: color };
  localStorage.setItem('bigpecas-theme', 'custom');
  localStorage.setItem('bigpecas-custom-theme', JSON.stringify(palette));
  const { result } = renderHook(useTheme, { wrapper: ThemeProvider });
  const style = document.documentElement.style;
  expect(result.current.customTheme).toEqual(palette);
  expect(style.colorScheme).toBe(color === '#000000' ? 'dark' : 'light');
  expect(style.getPropertyValue('--bp-on-primary')).toBe(color === '#000000' ? '#FFFFFF' : '#111111');
  expect(style.getPropertyValue('--bp-on-light')).toBe(color === '#000000' ? '#FFFFFF' : '#111111');
  act(() => result.current.setTheme('light'));
  expect(style.getPropertyValue('--bp-primary-action')).toBe('');
});
test('aceita apenas propriedades e cores válidas; restaura padrão', () => {
  const { result } = renderHook(useTheme, { wrapper: ThemeProvider });
  act(() => result.current.updateCustomTheme({ unknown: '#000000', primary: 'red' }));
  expect(result.current.theme).toBe('light');
  act(() => result.current.updateCustomTheme({ primary: '#123456', text: 'bad', unknown: '#000000' }));
  expect(result.current.theme).toBe('custom');
  expect(result.current.customTheme).toEqual({ ...DEFAULT_CUSTOM_THEME, primary: '#123456' });
  expect(JSON.parse(localStorage.getItem('bigpecas-custom-theme')).primary).toBe('#123456');
  act(() => result.current.resetCustomTheme());
  expect(result.current.customTheme).toEqual(DEFAULT_CUSTOM_THEME);
  expect(result.current.theme).toBe('custom');
});
describe('contraste do texto no tema personalizado', () => {
  const style = () => document.documentElement.style;

  test('mantem a cor de texto escolhida quando ja e legivel', () => {
    const { result } = renderHook(useTheme, { wrapper: ThemeProvider });
    act(() => result.current.updateCustomTheme({ text: '#1A2820' }));
    expect(style().getPropertyValue('--bp-text')).toBe('#1A2820');
    expect(ajustarContrasteTema(result.current.customTheme).textoAjustado).toBe(false);
  });

  test('troca o texto igual ao fundo por uma cor legivel', () => {
    const { result } = renderHook(useTheme, { wrapper: ThemeProvider });
    act(() => result.current.updateCustomTheme({ background: '#202020', surface: '#2A2A2A', text: '#252525' }));
    expect(style().getPropertyValue('--bp-text')).toBe('#FFFFFF');
    expect(ajustarContrasteTema(result.current.customTheme)).toMatchObject({ texto: '#FFFFFF', textoAjustado: true });
  });

  test('usa texto escuro em fundos claros e ajusta o destaque ilegivel', () => {
    const palette = { ...DEFAULT_CUSTOM_THEME, background: '#F5F5F5', surface: '#FFFFFF', primary: '#FAFAFA', text: '#EEEEEE' };
    expect(ajustarContrasteTema(palette)).toEqual({ texto: '#111111', destaque: '#111111', textoAjustado: true });
  });
});
