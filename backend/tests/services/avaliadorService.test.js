const { createSupabaseMock } = require('../helpers/supabaseMock');

const mockSupabaseAdmin = createSupabaseMock();

jest.mock('../../src/config/supabaseClient', () => ({
  supabaseAdmin: mockSupabaseAdmin,
  supabasePublic: null,
}));

const avaliadorService = require('../../src/services/avaliadorService');
const AppError = require('../../src/utils/AppError');

const PECA_PENDENTE = { id: 10, nome_peca: 'Friso Opala', revisao_avaliacao: 2 };
const RESPOSTAS = [{ criterio_id: 1, resposta: true }];

describe('avaliadorService', () => {
  beforeEach(() => {
    mockSupabaseAdmin.__reset();
  });

  describe('getPecasPendentes', () => {
    /** Consulta feita na tabela de pecas. */
    function consulta() {
      return mockSupabaseAdmin.__callsFor('pecas')[0];
    }

    it('lista somente as pecas aguardando validacao, das mais antigas para as novas', async () => {
      mockSupabaseAdmin.__mockTable('pecas', { data: [PECA_PENDENTE], error: null });

      await expect(avaliadorService.getPecasPendentes(1)).resolves.toEqual([PECA_PENDENTE]);
      expect(consulta().argumentos('eq')).toEqual(['status_publicacao', 'pendente_validacao']);
      expect(consulta().argumentos('order')).toEqual(['data_cadastro']);
    });

    it.each([
      ['padrao', undefined, undefined, [0, 19]],
      ['limit acima do maximo', 500, 0, [0, 99]],
      ['limit invalido', 'abc', 0, [0, 19]],
      ['limit zero', 0, 0, [0, 19]],
      ['offset fracionario', 10, 5.9, [5, 14]],
      ['offset negativo', 10, -3, [0, 9]],
    ])('protege a paginacao (%s)', async (_descricao, limit, offset, esperado) => {
      mockSupabaseAdmin.__mockTable('pecas', { data: [], error: null });

      await avaliadorService.getPecasPendentes(1, limit, offset);

      expect(consulta().argumentos('range')).toEqual(esperado);
    });

    it('propaga o erro do Supabase', async () => {
      const falha = new Error('sem conexao');
      mockSupabaseAdmin.__mockTable('pecas', { data: null, error: falha });

      await expect(avaliadorService.getPecasPendentes(1)).rejects.toBe(falha);
    });

    it('converte a excecao P0001 do Postgres em conflito 409', async () => {
      mockSupabaseAdmin.__mockTable('pecas', {
        data: null,
        error: { code: 'P0001', message: 'Avaliação já concluída.' },
      });

      await expect(avaliadorService.getPecasPendentes(1)).rejects.toMatchObject({
        statusCode: 409,
        message: 'Avaliação já concluída.',
      });
    });
  });

  describe('getValidacaoPeca', () => {
    it('junta a peca, a validacao da revisao atual e o snapshot de criterios', async () => {
      const validacao = { id: 3, revisao: 2, criterios_snapshot: [{ criterio_id: 1 }] };
      mockSupabaseAdmin.__mockTable('pecas', { data: PECA_PENDENTE, error: null });
      mockSupabaseAdmin.__mockTable('avaliacoes_pecas', { data: validacao, error: null });

      await expect(avaliadorService.getValidacaoPeca(10)).resolves.toEqual({
        peca: PECA_PENDENTE,
        validacao,
        criterios: [{ criterio_id: 1 }],
      });

      const igualdades = mockSupabaseAdmin.__callsFor('avaliacoes_pecas')[0]
        .operations.filter((op) => op.method === 'eq').map((op) => op.args);
      expect(igualdades).toEqual([['peca_id', 10], ['revisao', 2]]);
    });

    it('devolve criterios vazios quando ainda nao ha validacao', async () => {
      mockSupabaseAdmin.__mockTable('pecas', { data: PECA_PENDENTE, error: null });
      mockSupabaseAdmin.__mockTable('avaliacoes_pecas', { data: null, error: null });

      await expect(avaliadorService.getValidacaoPeca(10)).resolves.toMatchObject({
        validacao: null,
        criterios: [],
      });
    });

    it('devolve criterios vazios quando o snapshot esta ausente', async () => {
      mockSupabaseAdmin.__mockTable('pecas', { data: PECA_PENDENTE, error: null });
      mockSupabaseAdmin.__mockTable('avaliacoes_pecas', { data: { id: 3 }, error: null });

      await expect(avaliadorService.getValidacaoPeca(10)).resolves.toMatchObject({ criterios: [] });
    });

    it('responde 404 quando a peca nao existe', async () => {
      mockSupabaseAdmin.__mockTable('pecas', { data: null, error: null });

      await expect(avaliadorService.getValidacaoPeca(10)).rejects.toThrow('Peça não encontrada.');
      expect(mockSupabaseAdmin.__callsFor('avaliacoes_pecas')).toHaveLength(0);
    });
  });

  describe('getChecklistCriterios', () => {
    it('lista somente os criterios ativos, ordenados', async () => {
      mockSupabaseAdmin.__mockTable('checklist_validacao_peca', { data: [{ id: 1 }], error: null });

      await expect(avaliadorService.getChecklistCriterios()).resolves.toEqual([{ id: 1 }]);

      const [consulta] = mockSupabaseAdmin.__callsFor('checklist_validacao_peca');
      expect(consulta.argumentos('eq')).toEqual(['ativo', true]);
      expect(consulta.operations.filter((op) => op.method === 'order').map((op) => op.args)).toEqual([
        ['ordem'],
        ['id'],
      ]);
    });
  });

  describe('decidir', () => {
    it('chama a funcao do Postgres com a decisao do avaliador', async () => {
      mockSupabaseAdmin.rpc.mockResolvedValue({ data: { status: 'aprovada' }, error: null });

      await expect(
        avaliadorService.decidir(10, 9, RESPOSTAS, 'Peça conferida.', 2, false),
      ).resolves.toEqual({ status: 'aprovada' });

      expect(mockSupabaseAdmin.rpc).toHaveBeenCalledWith('decidir_avaliacao_peca', {
        p_peca: 10,
        p_avaliador: 9,
        p_revisao: 2,
        p_respostas: RESPOSTAS,
        p_comentarios: 'Peça conferida.',
        p_rejeitar: false,
      });
    });

    it('aceita comentario vazio quando a peca e aprovada', async () => {
      await expect(avaliadorService.decidir(10, 9, RESPOSTAS, '', 1, false)).resolves.toBeNull();
    });

    it('exige motivo na reprovacao', async () => {
      await expect(avaliadorService.decidir(10, 9, RESPOSTAS, '   ', 1, true)).rejects.toThrow(
        'Informe um comentário válido; a reprovação exige motivo.',
      );
      expect(mockSupabaseAdmin.rpc).not.toHaveBeenCalled();
    });

    it.each([
      ['nao e string', 42],
      ['passa de 5000 caracteres', 'x'.repeat(5001)],
    ])('recusa o comentario que %s', async (_descricao, comentarios) => {
      await expect(avaliadorService.decidir(10, 9, RESPOSTAS, comentarios, 1, false)).rejects.toThrow(
        AppError,
      );
    });

    it.each([
      ['zero', 0],
      ['negativa', -1],
      ['fracionaria', 1.5],
      ['nao numerica', '2'],
    ])('recusa a revisao %s pedindo recarregar a avaliacao', async (_descricao, revisao) => {
      await expect(
        avaliadorService.decidir(10, 9, RESPOSTAS, 'ok', revisao, false),
      ).rejects.toThrow('Recarregue a avaliação.');
    });

    it('valida o checklist antes de gravar a decisao', async () => {
      await expect(avaliadorService.decidir(10, 9, 'nao-e-array', 'ok', 1, false)).rejects.toThrow(
        'Envie as respostas do checklist.',
      );
      expect(mockSupabaseAdmin.rpc).not.toHaveBeenCalled();
    });

    it('converte o erro de regra de negocio do banco em 409', async () => {
      mockSupabaseAdmin.rpc.mockResolvedValue({
        data: null,
        error: { code: 'P0001', message: 'Esta revisão já foi avaliada.' },
      });

      await expect(avaliadorService.decidir(10, 9, RESPOSTAS, 'ok', 1, false)).rejects.toMatchObject({
        statusCode: 409,
        message: 'Esta revisão já foi avaliada.',
      });
    });
  });

  describe('getEstatisticas', () => {
    it('conta as pendentes na fila e o historico do avaliador', async () => {
      mockSupabaseAdmin.__mockTable('avaliacoes_pecas', {
        data: [
          { status: 'aprovada' },
          { status: 'aprovada' },
          { status: 'rejeitada' },
          { status: 'em_analise' },
        ],
        error: null,
      });
      mockSupabaseAdmin.__mockTable('pecas', { data: null, error: null, count: 7 });

      await expect(avaliadorService.getEstatisticas(9)).resolves.toEqual({
        pendentes: 7,
        total: 4,
        aprovadas: 2,
        rejeitadas: 1,
      });
      expect(mockSupabaseAdmin.__callsFor('pecas')[0].argumentos('eq')).toEqual([
        'status_publicacao',
        'pendente_validacao',
      ]);
    });

    it('zera os contadores quando o avaliador ainda nao avaliou nada', async () => {
      mockSupabaseAdmin.__mockTable('avaliacoes_pecas', { data: [], error: null });
      mockSupabaseAdmin.__mockTable('pecas', { data: null, error: null, count: 0 });

      await expect(avaliadorService.getEstatisticas(9)).resolves.toEqual({
        pendentes: 0,
        total: 0,
        aprovadas: 0,
        rejeitadas: 0,
      });
    });

    it('propaga a falha na contagem da fila', async () => {
      const falha = new Error('contagem indisponivel');
      mockSupabaseAdmin.__mockTable('avaliacoes_pecas', { data: [], error: null });
      mockSupabaseAdmin.__mockTable('pecas', { data: null, error: falha });

      await expect(avaliadorService.getEstatisticas(9)).rejects.toBe(falha);
    });
  });
});
