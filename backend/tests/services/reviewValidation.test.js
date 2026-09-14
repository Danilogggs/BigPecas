const { validarRespostas, validarCriterio } = require('../../src/services/reviewValidation');

describe('validacao de checklist', () => {
  it.each([null, {}, Array(201).fill({}), [null], [{ criterio_id: 0, resposta: true }],
    [{ criterio_id: 1, resposta: 'true' }],
    [{ criterio_id: 1, resposta: true }, { criterio_id: '1', resposta: false }],
    [{ criterio_id: 1, resposta: true, observacao: 3 }],
    [{ criterio_id: 1, resposta: true, observacao: 'x'.repeat(2001) }],
  ])('recusa respostas invalidas: %j', respostas => {
    expect(() => validarRespostas(respostas)).toThrow();
  });
  it('preserva respostas booleanas e observacoes opcionais', () => {
    const respostas = [{ criterio_id: 1, resposta: false },
      { criterio_id: 2, resposta: true, observacao: 'Conferido' },
      { criterio_id: 3, resposta: false, observacao: null }];
    expect(validarRespostas(respostas)).toEqual(respostas);
    expect(validarRespostas([])).toEqual([]);
  });
  const criterio = { nome_criterio: ' Original? ', obrigatorio: true, ativo: false, ordem: 0 };
  it.each([{ nome_criterio: null }, { nome_criterio: ' ' }, { nome_criterio: 'x'.repeat(301) },
    { obrigatorio: 'true' }, { ativo: 1 }, { ordem: 1.5 }, { ordem: -1 },
    { descricao: 5 }, { descricao: 'x'.repeat(2001) },
  ])('recusa criterio invalido: %j', changes => {
    expect(() => validarCriterio({ ...criterio, ...changes })).toThrow();
  });
  it('normaliza um criterio e registra a atualizacao', () => {
    expect(validarCriterio(criterio)).toMatchObject({ ...criterio, nome_criterio: 'Original?', descricao: '', atualizado_em: expect.any(String) });
    expect(validarCriterio({ ...criterio, descricao: 'Confira a marca' }).descricao).toBe('Confira a marca');
  });
});
