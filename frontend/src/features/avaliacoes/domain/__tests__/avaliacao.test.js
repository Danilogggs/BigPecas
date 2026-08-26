import { avaliacaoLiberada, itensPendentesAvaliacao, notaValida } from '../avaliacao';

describe('domínio de avaliações', () => {
  it('aceita somente notas inteiras de um a cinco', () => {
    expect(notaValida(5)).toBe(true);
    expect(notaValida(0)).toBe(false);
    expect(notaValida(4.5)).toBe(false);
  });

  it('identifica liberação e avaliações pendentes', () => {
    const estado = {
      liberada: true,
      fornecedores: [{ id: 1, avaliado: true }],
      produtos: [{ id: 2, avaliado: false }],
    };
    expect(avaliacaoLiberada(estado)).toBe(true);
    expect(itensPendentesAvaliacao(estado)).toEqual([{ id: 2, avaliado: false }]);
  });
});
