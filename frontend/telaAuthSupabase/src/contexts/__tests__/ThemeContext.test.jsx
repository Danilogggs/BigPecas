import { renderHook, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../ThemeContext';

const STORAGE_KEY = 'bigpecas-theme';

function montarTema() {
  return renderHook(() => useTheme(), { wrapper: ThemeProvider });
}

describe('ThemeContext', () => {
  afterEach(() => {
    delete document.documentElement.dataset.theme;
    document.documentElement.style.colorScheme = '';
  });

  it('usa o tema claro por padrao', () => {
    const { result } = montarTema();

    expect(result.current.theme).toBe('light');
  });

  it.each([['light'], ['dark']])('restaura o tema "%s" salvo no navegador', (tema) => {
    localStorage.setItem(STORAGE_KEY, tema);

    expect(montarTema().result.current.theme).toBe(tema);
  });

  it('ignora um tema invalido salvo no navegador', () => {
    localStorage.setItem(STORAGE_KEY, 'neon');

    expect(montarTema().result.current.theme).toBe('light');
  });

  it('aplica o tema no elemento raiz do documento', () => {
    const { result } = montarTema();

    expect(document.documentElement.dataset.theme).toBe('light');
    expect(document.documentElement.style.colorScheme).toBe('light');

    act(() => { result.current.setTheme('dark'); });

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('salva a escolha do usuario', () => {
    const { result } = montarTema();

    act(() => { result.current.setTheme('dark'); });

    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');
  });

  it.each([['neon'], [''], [null], [undefined]])(
    'ignora a tentativa de trocar para o tema invalido %p',
    (tema) => {
      const { result } = montarTema();

      act(() => { result.current.setTheme(tema); });

      expect(result.current.theme).toBe('light');
    },
  );

  describe('quando o navegador bloqueia o localStorage', () => {
    it('continua no tema claro na inicializacao', () => {
      jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('acesso negado ao armazenamento');
      });

      expect(montarTema().result.current.theme).toBe('light');
    });

    it('ainda aplica a troca visual do tema', () => {
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('acesso negado ao armazenamento');
      });

      const { result } = montarTema();

      act(() => { result.current.setTheme('dark'); });

      expect(result.current.theme).toBe('dark');
      expect(document.documentElement.dataset.theme).toBe('dark');
    });
  });

  describe('useTheme', () => {
    it('exige o ThemeProvider', () => {
      expect(() => renderHook(() => useTheme())).toThrow(
        'useTheme must be used within a ThemeProvider',
      );
    });
  });
});
