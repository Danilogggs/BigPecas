import {
  WIDGETS_PADRAO,
  alternarWidget,
  filtrarWidgetsValidos,
  moverWidget,
} from '../dashboard';

describe('domínio do painel administrativo', () => {
  it('remove widgets desconhecidos e usa o padrão quando necessário', () => {
    expect(filtrarWidgetsValidos(['usuarios', 'desconhecido'])).toEqual(['usuarios']);
    expect(filtrarWidgetsValidos([])).toEqual(WIDGETS_PADRAO);
  });

  it('mantém pelo menos um widget ativo', () => {
    expect(alternarWidget(['usuarios'], 'usuarios')).toEqual(['usuarios']);
    expect(alternarWidget(['usuarios'], 'pecas')).toEqual(['usuarios', 'pecas']);
  });

  it('reordena apenas para posições válidas', () => {
    expect(moverWidget(['usuarios', 'pecas'], 'pecas', -1)).toEqual(['pecas', 'usuarios']);
    expect(moverWidget(['usuarios', 'pecas'], 'usuarios', -1)).toEqual(['usuarios', 'pecas']);
  });
});
