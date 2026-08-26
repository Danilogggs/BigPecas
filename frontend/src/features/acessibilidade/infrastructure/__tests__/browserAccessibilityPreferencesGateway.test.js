import {
  ACCESSIBILITY_STORAGE_KEY,
  criarBrowserAccessibilityPreferencesGateway,
} from '../browserAccessibilityPreferencesGateway';

function criarStorage() {
  return {
    getItem: jest.fn(),
    setItem: jest.fn(),
  };
}

describe('browserAccessibilityPreferencesGateway', () => {
  it('carrega e normaliza preferências persistidas', () => {
    const storage = criarStorage();
    storage.getItem.mockReturnValue(JSON.stringify({
      textScale: 'large',
      readableFont: true,
      emphasizeLinks: false,
      ignored: true,
    }));

    expect(criarBrowserAccessibilityPreferencesGateway(storage).load()).toEqual({
      textScale: 'large',
      readableFont: true,
      emphasizeLinks: false,
    });
  });

  it('retorna o padrão quando o conteúdo salvo é inválido', () => {
    const storage = criarStorage();
    storage.getItem.mockReturnValue('{invalid-json');

    expect(criarBrowserAccessibilityPreferencesGateway(storage).load()).toEqual({
      textScale: 'default',
      readableFont: false,
      emphasizeLinks: false,
    });
  });

  it('salva somente preferências normalizadas', () => {
    const storage = criarStorage();
    const gateway = criarBrowserAccessibilityPreferencesGateway(storage);

    expect(gateway.save({ textScale: 'invalid', readableFont: true })).toBe(true);
    expect(storage.setItem).toHaveBeenCalledWith(
      ACCESSIBILITY_STORAGE_KEY,
      JSON.stringify({
        textScale: 'default',
        readableFont: true,
        emphasizeLinks: false,
      }),
    );
  });

  it('tolera armazenamento ausente ou bloqueado', () => {
    expect(criarBrowserAccessibilityPreferencesGateway(null).save({})).toBe(false);
    expect(criarBrowserAccessibilityPreferencesGateway(null).load()).toEqual({
      textScale: 'default',
      readableFont: false,
      emphasizeLinks: false,
    });

    const storage = criarStorage();
    storage.getItem.mockImplementation(() => { throw new Error('blocked'); });
    storage.setItem.mockImplementation(() => { throw new Error('blocked'); });
    const gateway = criarBrowserAccessibilityPreferencesGateway(storage);

    expect(gateway.load().textScale).toBe('default');
    expect(gateway.save({ textScale: 'large' })).toBe(false);
  });
});
