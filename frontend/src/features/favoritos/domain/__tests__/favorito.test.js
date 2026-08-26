import {
  criarIdsFavoritos,
  extrairPecasFavoritas,
  removerFavoritoDaLista,
} from '../favorito';

describe('domínio de favoritos', () => {
  const pecas = [{ id: 1 }, { id: '2' }];

  it('extrai peças apenas de respostas válidas', () => {
    expect(extrairPecasFavoritas({ pecas })).toEqual(pecas);
    expect(extrairPecasFavoritas({ pecas: null })).toEqual([]);
  });

  it('normaliza ids e remove sem depender do tipo do identificador', () => {
    expect(criarIdsFavoritos(pecas)).toEqual(new Set(['1', '2']));
    expect(removerFavoritoDaLista(pecas, 2)).toEqual([{ id: 1 }]);
  });
});
