import { act, renderHook } from '@testing-library/react';
import {
  AccessibilityProvider,
  useAccessibility,
} from '../AccessibilityContext';

function criarGateway(initial = {}) {
  return {
    load: jest.fn(() => ({
      textScale: 'default',
      readableFont: false,
      emphasizeLinks: false,
      ...initial,
    })),
    save: jest.fn(() => true),
  };
}

function montarAcessibilidade(gateway = criarGateway()) {
  const wrapper = ({ children }) => (
    <AccessibilityProvider gateway={gateway}>{children}</AccessibilityProvider>
  );

  return { gateway, ...renderHook(() => useAccessibility(), { wrapper }) };
}

describe('AccessibilityContext', () => {
  afterEach(() => {
    delete document.documentElement.dataset.textScale;
    delete document.documentElement.dataset.readableFont;
    delete document.documentElement.dataset.emphasizeLinks;
  });

  it('restaura e aplica as preferências fornecidas pelo gateway', () => {
    const gateway = criarGateway({ textScale: 'large', readableFont: true });

    montarAcessibilidade(gateway);

    expect(gateway.load).toHaveBeenCalledTimes(1);
    expect(document.documentElement.dataset.textScale).toBe('large');
    expect(document.documentElement.dataset.readableFont).toBe('true');
    expect(document.documentElement.dataset.emphasizeLinks).toBe('false');
  });

  it('altera apenas a preferência solicitada e persiste o resultado', () => {
    const { result, gateway } = montarAcessibilidade();

    act(() => result.current.setPreferences({ emphasizeLinks: true }));

    expect(result.current.preferences).toEqual({
      textScale: 'default',
      readableFont: false,
      emphasizeLinks: true,
    });
    expect(document.documentElement.dataset.emphasizeLinks).toBe('true');
    expect(gateway.save).toHaveBeenLastCalledWith(result.current.preferences);
  });

  it('restaura o padrão sem depender do tema', () => {
    const { result } = montarAcessibilidade(criarGateway({
      textScale: 'extra-large',
      readableFont: true,
      emphasizeLinks: true,
    }));

    act(() => result.current.resetPreferences());

    expect(result.current.isDefault).toBe(true);
    expect(document.documentElement.dataset.textScale).toBe('default');
    expect(document.documentElement.dataset.readableFont).toBe('false');
    expect(document.documentElement.dataset.emphasizeLinks).toBe('false');
  });

  it('mantém a alteração em memória quando o gateway não persiste', () => {
    const gateway = criarGateway();
    gateway.save.mockReturnValue(false);
    const { result } = montarAcessibilidade(gateway);

    act(() => result.current.setPreferences({ textScale: 'large' }));

    expect(result.current.preferences.textScale).toBe('large');
    expect(document.documentElement.dataset.textScale).toBe('large');
  });

  it('exige o provider', () => {
    expect(() => renderHook(() => useAccessibility())).toThrow(
      'useAccessibility must be used within an AccessibilityProvider',
    );
  });
});
