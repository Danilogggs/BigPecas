const request = require('supertest');
const { createSupabaseMock } = require('../helpers/supabaseMock');

const mockSupabaseAdmin = createSupabaseMock();
const mockGarantirVendasDoPedido = jest.fn(async (pedido) => pedido);

jest.mock('../../src/config/supabaseClient', () => ({
  supabaseAdmin: mockSupabaseAdmin,
  supabasePublic: null,
}));

jest.mock('../../src/services/vendasService', () => ({
  garantirVendasDoPedido: mockGarantirVendasDoPedido,
}));

const avaliacoesRoutes = require('../../src/routes/avaliacoesRoutes');
const { buildTestApp } = require('../helpers/testApp');

const COMPRADOR = { id: 42, email: 'cliente@bigpecas.com', full_name: 'Maria', nome_loja: null };

const ITEM_FRISO = {
  id: 10,
  nome: 'Friso Opala',
  venda_id: 'venda-1',
  fornecedor_id: 5,
  fornecedor_nome: 'Loja do Zé',
  imagem: 'friso.png',
};

function pedidoEntregue(overrides = {}) {
  return {
    id: '2026-100200',
    user_id: 42,
    status: 'entregue',
    itens: [ITEM_FRISO],
    ...overrides,
  };
}

const app = buildTestApp(avaliacoesRoutes, {
  user: { email: 'cliente@bigpecas.com' },
  basePath: '/api/avaliacoes',
});

function mockarUsuarioAtual(usuario = COMPRADOR) {
  mockSupabaseAdmin.__queueTable('users', { data: usuario, error: null });
}

function mockarPedido(pedido) {
  mockSupabaseAdmin.__queueTable('pedidos', { data: pedido, error: null });
  mockGarantirVendasDoPedido.mockImplementation(async (dados) => ({ ...dados, itens: pedido.itens }));
}

describe('avaliacoesRoutes', () => {
  beforeEach(() => {
    mockSupabaseAdmin.__reset();
    mockGarantirVendasDoPedido.mockImplementation(async (pedido) => pedido);
  });

  describe('GET /pedidos/:pedidoId', () => {
    it('libera a avaliacao e lista fornecedores e produtos do pedido entregue', async () => {
      mockarUsuarioAtual();
      mockarPedido(pedidoEntregue());
      mockSupabaseAdmin.__mockTable('avaliacoes_fornecedor', { data: [], error: null });
      mockSupabaseAdmin.__mockTable('avaliacoes_produto', { data: [], error: null });

      const resposta = await request(app).get('/api/avaliacoes/pedidos/2026-100200');

      expect(resposta.status).toBe(200);
      expect(resposta.body).toMatchObject({
        pedido_id: '2026-100200',
        status: 'entregue',
        liberada: true,
        motivo_bloqueio: null,
      });
      expect(resposta.body.fornecedores).toEqual([
        expect.objectContaining({ fornecedor_id: 5, fornecedor_nome: 'Loja do Zé', avaliado: false }),
      ]);
      expect(resposta.body.produtos).toEqual([
        expect.objectContaining({ peca_id: 10, venda_id: 'venda-1', avaliado: false }),
      ]);
    });

    it('bloqueia com motivo quando o pedido ainda nao foi entregue', async () => {
      mockarUsuarioAtual();
      mockarPedido(pedidoEntregue({ status: 'enviado' }));
      mockSupabaseAdmin.__mockTable('avaliacoes_fornecedor', { data: [], error: null });
      mockSupabaseAdmin.__mockTable('avaliacoes_produto', { data: [], error: null });

      const resposta = await request(app).get('/api/avaliacoes/pedidos/2026-100200');

      expect(resposta.body.liberada).toBe(false);
      expect(resposta.body.motivo_bloqueio).toContain('Confirme o recebimento');
    });

    it('marca o que ja foi avaliado', async () => {
      mockarUsuarioAtual();
      mockarPedido(pedidoEntregue());
      mockSupabaseAdmin.__mockTable('avaliacoes_fornecedor', {
        data: [{ id: 1, fornecedor_id: 5, nota: 5 }],
        error: null,
      });
      mockSupabaseAdmin.__mockTable('avaliacoes_produto', {
        data: [{ id: 2, venda_id: 'venda-1', nota: 4 }],
        error: null,
      });

      const resposta = await request(app).get('/api/avaliacoes/pedidos/2026-100200');

      expect(resposta.body.fornecedores[0]).toMatchObject({ avaliado: true, avaliacao: { nota: 5 } });
      expect(resposta.body.produtos[0]).toMatchObject({ avaliado: true, avaliacao: { nota: 4 } });
    });

    it('agrupa varios itens do mesmo fornecedor em uma unica avaliacao de vendedor', async () => {
      mockarUsuarioAtual();
      mockarPedido(pedidoEntregue({
        itens: [ITEM_FRISO, { ...ITEM_FRISO, id: 11, venda_id: 'venda-2' }],
      }));
      mockSupabaseAdmin.__mockTable('avaliacoes_fornecedor', { data: [], error: null });
      mockSupabaseAdmin.__mockTable('avaliacoes_produto', { data: [], error: null });

      const resposta = await request(app).get('/api/avaliacoes/pedidos/2026-100200');

      expect(resposta.body.fornecedores).toHaveLength(1);
      expect(resposta.body.fornecedores[0].venda_ids).toEqual(['venda-1', 'venda-2']);
      expect(resposta.body.produtos).toHaveLength(2);
    });

    it('esconde o pedido de outro comprador com 404', async () => {
      mockarUsuarioAtual();
      mockarPedido(pedidoEntregue({ user_id: 99 }));

      const resposta = await request(app).get('/api/avaliacoes/pedidos/2026-100200');

      expect(resposta.status).toBe(404);
      expect(resposta.body.error).toBe('Compra não encontrada.');
    });

    it('responde 404 quando o pedido nao existe', async () => {
      mockarUsuarioAtual();
      mockSupabaseAdmin.__queueTable('pedidos', { data: null, error: null });

      expect((await request(app).get('/api/avaliacoes/pedidos/nada')).status).toBe(404);
    });
  });

  describe('POST /fornecedores', () => {
    const avaliacaoValida = {
      pedido_id: '2026-100200',
      fornecedor_id: 5,
      nota: 5,
      comentario: '  Entrega muito rápida  ',
      qualidade_peca: 5,
      comunicacao: 4,
      rapidez_entrega: 5,
      embalagem: 4,
    };

    function payloadInserido() {
      return mockSupabaseAdmin
        .__callsFor('avaliacoes_fornecedor')
        .find((consulta) => consulta.operacao('insert'))
        .argumentos('insert')[0];
    }

    it('registra a avaliacao vinculada a venda e marcada como verificada', async () => {
      mockarUsuarioAtual();
      mockarPedido(pedidoEntregue());
      mockSupabaseAdmin.__queueTable(
        'avaliacoes_fornecedor',
        { data: null, error: null },
        { data: { id: 1, nota: 5 }, error: null },
      );

      const resposta = await request(app).post('/api/avaliacoes/fornecedores').send(avaliacaoValida);

      expect(resposta.status).toBe(201);
      expect(payloadInserido()).toMatchObject({
        pedido_id: '2026-100200',
        fornecedor_id: 5,
        comprador_id: 42,
        venda_id: 'venda-1',
        nota: 5,
        comentario: 'Entrega muito rápida',
        verificada: true,
      });
    });

    it('guarda null quando o comentario vem vazio', async () => {
      mockarUsuarioAtual();
      mockarPedido(pedidoEntregue());
      mockSupabaseAdmin.__queueTable(
        'avaliacoes_fornecedor',
        { data: null, error: null },
        { data: { id: 1 }, error: null },
      );

      await request(app).post('/api/avaliacoes/fornecedores').send({ ...avaliacaoValida, comentario: '   ' });

      expect(payloadInserido().comentario).toBeNull();
    });

    it('recusa comentario com mais de 1000 caracteres', async () => {
      mockarUsuarioAtual();
      mockarPedido(pedidoEntregue());
      mockSupabaseAdmin.__mockTable('avaliacoes_fornecedor', { data: null, error: null });

      const resposta = await request(app)
        .post('/api/avaliacoes/fornecedores')
        .send({ ...avaliacaoValida, comentario: 'a'.repeat(1001) });

      expect(resposta.status).toBe(400);
      expect(resposta.body.error).toContain('1000 caracteres');
    });

    it.each([
      ['nota', 'nota'],
      ['qualidade_peca', 'qualidade da peça'],
      ['comunicacao', 'comunicação'],
      ['rapidez_entrega', 'rapidez da entrega'],
      ['embalagem', 'embalagem'],
    ])('valida o campo %s citando o nome amigavel', async (campo, rotulo) => {
      mockarUsuarioAtual();
      mockarPedido(pedidoEntregue());
      mockSupabaseAdmin.__mockTable('avaliacoes_fornecedor', { data: null, error: null });

      const resposta = await request(app)
        .post('/api/avaliacoes/fornecedores')
        .send({ ...avaliacaoValida, [campo]: 9 });

      expect(resposta.status).toBe(400);
      expect(resposta.body.error).toBe(`${rotulo} deve ser um número inteiro entre 1 e 5.`);
    });

    it.each([[0], [6], [2.5], ['cinco'], [undefined]])(
      'recusa a nota invalida %p',
      async (nota) => {
        mockarUsuarioAtual();
        mockarPedido(pedidoEntregue());
        mockSupabaseAdmin.__mockTable('avaliacoes_fornecedor', { data: null, error: null });

        const resposta = await request(app)
          .post('/api/avaliacoes/fornecedores')
          .send({ ...avaliacaoValida, nota });

        expect(resposta.status).toBe(400);
      },
    );

    it('so libera a avaliacao depois da entrega', async () => {
      mockarUsuarioAtual();
      mockarPedido(pedidoEntregue({ status: 'enviado' }));

      const resposta = await request(app).post('/api/avaliacoes/fornecedores').send(avaliacaoValida);

      expect(resposta.status).toBe(409);
      expect(resposta.body.error).toContain('só é liberada após');
    });

    it('recusa avaliar um vendedor que nao participou da compra', async () => {
      mockarUsuarioAtual();
      mockarPedido(pedidoEntregue());

      const resposta = await request(app)
        .post('/api/avaliacoes/fornecedores')
        .send({ ...avaliacaoValida, fornecedor_id: 999 });

      expect(resposta.status).toBe(400);
      expect(resposta.body.error).toBe('O vendedor informado não pertence a esta compra.');
    });

    it('impede avaliar o mesmo vendedor duas vezes no mesmo pedido', async () => {
      mockarUsuarioAtual();
      mockarPedido(pedidoEntregue());
      mockSupabaseAdmin.__mockTable('avaliacoes_fornecedor', { data: { id: 1 }, error: null });

      const resposta = await request(app).post('/api/avaliacoes/fornecedores').send(avaliacaoValida);

      expect(resposta.status).toBe(409);
      expect(resposta.body.error).toBe('Este vendedor já foi avaliado nesta compra.');
    });

    it('traduz a colisao de unicidade do banco em 409', async () => {
      mockarUsuarioAtual();
      mockarPedido(pedidoEntregue());
      mockSupabaseAdmin.__queueTable(
        'avaliacoes_fornecedor',
        { data: null, error: null },
        { data: null, error: { code: '23505' } },
      );

      const resposta = await request(app).post('/api/avaliacoes/fornecedores').send(avaliacaoValida);

      expect(resposta.status).toBe(409);
      expect(resposta.body.error).toBe('Este vendedor já foi avaliado nesta compra.');
    });
  });

  describe('POST /produtos', () => {
    const avaliacaoValida = { pedido_id: '2026-100200', venda_id: 'venda-1', nota: 4, comentario: 'Boa peça' };

    function payloadInserido() {
      return mockSupabaseAdmin
        .__callsFor('avaliacoes_produto')
        .find((consulta) => consulta.operacao('insert'))
        .argumentos('insert')[0];
    }

    it('registra a avaliacao do produto identificado pela venda', async () => {
      mockarUsuarioAtual();
      mockarPedido(pedidoEntregue());
      mockSupabaseAdmin.__queueTable(
        'avaliacoes_produto',
        { data: null, error: null },
        { data: { id: 3, nota: 4 }, error: null },
      );

      const resposta = await request(app).post('/api/avaliacoes/produtos').send(avaliacaoValida);

      expect(resposta.status).toBe(201);
      expect(payloadInserido()).toMatchObject({
        pedido_id: '2026-100200',
        venda_id: 'venda-1',
        peca_id: 10,
        fornecedor_id: 5,
        comprador_id: 42,
        nota: 4,
        verificada: true,
      });
    });

    it('aceita identificar o produto por peca_id quando venda_id nao e enviado', async () => {
      mockarUsuarioAtual();
      mockarPedido(pedidoEntregue());
      mockSupabaseAdmin.__queueTable(
        'avaliacoes_produto',
        { data: null, error: null },
        { data: { id: 3 }, error: null },
      );

      const resposta = await request(app)
        .post('/api/avaliacoes/produtos')
        .send({ pedido_id: '2026-100200', peca_id: 10, nota: 4 });

      expect(resposta.status).toBe(201);
      expect(payloadInserido().venda_id).toBe('venda-1');
    });

    it('recusa produto que nao pertence a compra', async () => {
      mockarUsuarioAtual();
      mockarPedido(pedidoEntregue());

      const resposta = await request(app)
        .post('/api/avaliacoes/produtos')
        .send({ ...avaliacaoValida, venda_id: 'venda-de-outro' });

      expect(resposta.status).toBe(400);
      expect(resposta.body.error).toBe('O produto informado não pertence a esta compra.');
    });

    it('impede avaliar o mesmo produto duas vezes', async () => {
      mockarUsuarioAtual();
      mockarPedido(pedidoEntregue());
      mockSupabaseAdmin.__mockTable('avaliacoes_produto', { data: { id: 3 }, error: null });

      const resposta = await request(app).post('/api/avaliacoes/produtos').send(avaliacaoValida);

      expect(resposta.status).toBe(409);
      expect(resposta.body.error).toBe('Este produto já foi avaliado nesta compra.');
    });

    it('exige o pedido entregue', async () => {
      mockarUsuarioAtual();
      mockarPedido(pedidoEntregue({ status: 'pago' }));

      expect((await request(app).post('/api/avaliacoes/produtos').send(avaliacaoValida)).status).toBe(409);
    });
  });

  describe('GET /fornecedores/:fornecedorId', () => {
    it('calcula a media geral e por criterio com uma casa decimal', async () => {
      mockSupabaseAdmin.__mockTable('avaliacoes_fornecedor', {
        data: [
          { nota: 5, qualidade_peca: 5, comunicacao: 4, rapidez_entrega: 5, embalagem: 3 },
          { nota: 4, qualidade_peca: 4, comunicacao: 4, rapidez_entrega: 4, embalagem: 4 },
        ],
        error: null,
      });

      const resposta = await request(app).get('/api/avaliacoes/fornecedores/5');

      expect(resposta.status).toBe(200);
      expect(resposta.body.resumo).toEqual({
        total: 2,
        media: 4.5,
        qualidade_peca: 4.5,
        comunicacao: 4,
        rapidez_entrega: 4.5,
        embalagem: 3.5,
      });
    });

    it('devolve zeros quando o vendedor ainda nao tem avaliacoes', async () => {
      mockSupabaseAdmin.__mockTable('avaliacoes_fornecedor', { data: [], error: null });

      const resposta = await request(app).get('/api/avaliacoes/fornecedores/5');

      expect(resposta.body).toEqual({
        resumo: { total: 0, media: 0, qualidade_peca: 0, comunicacao: 0, rapidez_entrega: 0, embalagem: 0 },
        avaliacoes: [],
      });
    });

    it('lista somente avaliacoes verificadas, das mais recentes para as mais antigas', async () => {
      mockSupabaseAdmin.__mockTable('avaliacoes_fornecedor', { data: [], error: null });

      await request(app).get('/api/avaliacoes/fornecedores/5');

      const [consulta] = mockSupabaseAdmin.__callsFor('avaliacoes_fornecedor');
      expect(consulta.operations.filter((op) => op.method === 'eq').map((op) => op.args)).toEqual([
        ['fornecedor_id', '5'],
        ['verificada', true],
      ]);
      expect(consulta.argumentos('order')).toEqual(['data_avaliacao', { ascending: false }]);
    });
  });

  describe('GET /produtos/:pecaId', () => {
    it('resume as avaliacoes da peca', async () => {
      mockSupabaseAdmin.__mockTable('avaliacoes_produto', {
        data: [{ nota: 5 }, { nota: 4 }, { nota: 4 }],
        error: null,
      });

      const resposta = await request(app).get('/api/avaliacoes/produtos/10');

      expect(resposta.body.resumo).toEqual({ total: 3, media: 4.3 });
      expect(resposta.body.avaliacoes).toHaveLength(3);
    });

    it('trata nota ausente como zero na media', async () => {
      mockSupabaseAdmin.__mockTable('avaliacoes_produto', { data: [{ nota: 4 }, {}], error: null });

      const resposta = await request(app).get('/api/avaliacoes/produtos/10');

      expect(resposta.body.resumo.media).toBe(2);
    });

    it('propaga erro do Supabase como 503 quando a tabela nao existe', async () => {
      mockSupabaseAdmin.__mockTable('avaliacoes_produto', { data: null, error: { code: '42P01' } });

      expect((await request(app).get('/api/avaliacoes/produtos/10')).status).toBe(503);
    });
  });
});
