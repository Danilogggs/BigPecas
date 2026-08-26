import {
  DEFAULT_VISUAL_PREFERENCES,
  criarAtributosVisuais,
  mesclarPreferenciasVisuais,
  normalizarPreferenciasVisuais,
  preferenciasSaoPadrao,
} from '../preferenciasVisuais';

describe('preferenciasVisuais', () => {
  it.each([undefined, null, 'invalid', 42])(
    'usa o padrão para uma entrada inválida: %p',
    (value) => {
      expect(normalizarPreferenciasVisuais(value)).toEqual(DEFAULT_VISUAL_PREFERENCES);
    },
  );

  it('preserva apenas valores permitidos', () => {
    expect(normalizarPreferenciasVisuais({
      textScale: 'extra-large',
      readableFont: true,
      emphasizeLinks: true,
      unknown: 'ignored',
    })).toEqual({
      textScale: 'extra-large',
      readableFont: true,
      emphasizeLinks: true,
    });
  });

  it('descarta escala e booleanos inválidos', () => {
    expect(normalizarPreferenciasVisuais({
      textScale: 'gigantic',
      readableFont: 'true',
      emphasizeLinks: 1,
    })).toEqual(DEFAULT_VISUAL_PREFERENCES);
  });

  it('mescla uma alteração sem perder as demais preferências', () => {
    expect(mesclarPreferenciasVisuais(
      { textScale: 'large', readableFont: true, emphasizeLinks: false },
      { emphasizeLinks: true },
    )).toEqual({ textScale: 'large', readableFont: true, emphasizeLinks: true });
  });

  it('identifica o estado padrão depois da normalização', () => {
    expect(preferenciasSaoPadrao({ textScale: 'invalid' })).toBe(true);
    expect(preferenciasSaoPadrao({ textScale: 'large' })).toBe(false);
  });

  it('converte preferências em atributos seguros para o documento', () => {
    expect(criarAtributosVisuais({ readableFont: true, emphasizeLinks: true })).toEqual({
      textScale: 'default',
      readableFont: 'true',
      emphasizeLinks: 'true',
    });
  });
});
