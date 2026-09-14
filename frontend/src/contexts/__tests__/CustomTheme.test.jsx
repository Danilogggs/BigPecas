import { act, renderHook } from '@testing-library/react';
import { ThemeProvider, useTheme, DEFAULT_CUSTOM_THEME } from '../ThemeContext';
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
