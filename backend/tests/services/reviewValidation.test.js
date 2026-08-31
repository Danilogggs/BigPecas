const { validarRespostas, validarCriterio } = require('../../src/services/reviewValidation');
const AppError = require('../../src/utils/AppError');

/** Payload minimo aceito por `validarCriterio`. */
const CRITERIO_VALIDO = Object.freeze({
  nome_criterio: '  Peça confere com as fotos  ',
  descricao: 'Compare o anúncio com as imagens enviadas.',
  obrigatorio: true,
  ativo: true,
  ordem: 3,
});

describe('reviewValidation', () => {
  describe('validarRespostas', () => {
    it('aceita e devolve a lista de respostas do checklist', () => {
      const respostas = [
        { criterio_id: 1, resposta: true },
        { criterio_id: '2', resposta: false, observacao: 'Faltou a nota fiscal.' },
      ];

      expect(validarRespostas(respostas)).toBe(respostas);
    });

    it('aceita a lista vazia', () => {
      expect(validarRespostas([])).toEqual([]);
    });

    it('aceita observacao nula', () => {
      expect(validarRespostas([{ criterio_id: 1, resposta: true, observacao: null }])).toHaveLength(1);
    });

    it.each([
      ['nao e um array', { criterio_id: 1 }],
      ['e nulo', null],
      ['e indefinido', undefined],
      ['e uma string', 'ok'],
    ])('recusa o checklist que %s', (_descricao, entrada) => {
      expect(() => validarRespostas(entrada)).toThrow(AppError);
      expect(() => validarRespostas(entrada)).toThrow('Envie as respostas do checklist.');
    });

    it('recusa mais de 200 respostas', () => {
      const respostas = Array.from({ length: 201 }, (_, i) => ({ criterio_id: i + 1, resposta: true }));

      expect(() => validarRespostas(respostas)).toThrow('Envie as respostas do checklist.');
    });

    it.each([
      ['criterio_id zero', [{ criterio_id: 0, resposta: true }]],
      ['criterio_id negativo', [{ criterio_id: -1, resposta: true }]],
      ['criterio_id nao numerico', [{ criterio_id: 'abc', resposta: true }]],
      ['criterio_id ausente', [{ resposta: true }]],
      ['resposta nao booleana', [{ criterio_id: 1, resposta: 'sim' }]],
      ['resposta ausente', [{ criterio_id: 1 }]],
      ['item nulo', [null]],
      ['criterio_id repetido', [
        { criterio_id: 1, resposta: true },
        { criterio_id: '1', resposta: false },
      ]],
    ])('recusa o checklist com %s', (_descricao, respostas) => {
      expect(() => validarRespostas(respostas)).toThrow(
        'Checklist inválido: use critérios únicos e respostas booleanas.',
      );
    });

    it.each([
      ['nao e string', 42],
      ['passa de 2000 caracteres', 'x'.repeat(2001)],
    ])('recusa a observacao que %s', (_descricao, observacao) => {
      expect(() => validarRespostas([{ criterio_id: 1, resposta: true, observacao }])).toThrow(
        'Observação inválida.',
      );
    });
  });

  describe('validarCriterio', () => {
    it('normaliza o criterio e carimba a data de atualizacao', () => {
      const criterio = validarCriterio({ ...CRITERIO_VALIDO });

      expect(criterio).toMatchObject({
        nome_criterio: 'Peça confere com as fotos',
        descricao: 'Compare o anúncio com as imagens enviadas.',
        obrigatorio: true,
        ativo: true,
        ordem: 3,
      });
      expect(Number.isNaN(Date.parse(criterio.atualizado_em))).toBe(false);
    });

    it('aceita ordem zero e troca a descricao ausente por texto vazio', () => {
      const criterio = validarCriterio({ ...CRITERIO_VALIDO, ordem: 0, descricao: undefined });

      expect(criterio).toMatchObject({ ordem: 0, descricao: '' });
    });

    it.each([
      ['nome nao e string', { nome_criterio: 10 }],
      ['nome so tem espacos', { nome_criterio: '   ' }],
      ['nome passa de 300 caracteres', { nome_criterio: 'x'.repeat(301) }],
      ['obrigatorio nao e booleano', { obrigatorio: 'sim' }],
      ['ativo nao e booleano', { ativo: 1 }],
      ['ordem nao e inteira', { ordem: 1.5 }],
      ['ordem e negativa', { ordem: -1 }],
      ['ordem nao e numero', { ordem: '2' }],
      ['descricao nao e string', { descricao: 99 }],
      ['descricao passa de 2000 caracteres', { descricao: 'x'.repeat(2001) }],
    ])('recusa o criterio quando %s', (_descricao, sobrescritas) => {
      expect(() => validarCriterio({ ...CRITERIO_VALIDO, ...sobrescritas })).toThrow(AppError);
      expect(() => validarCriterio({ ...CRITERIO_VALIDO, ...sobrescritas })).toThrow(
        'Informe texto, ordem inteira não negativa, ativação e obrigatoriedade válidos.',
      );
    });
  });
});
