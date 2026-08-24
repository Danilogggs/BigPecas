const request = require('supertest');
const { createSupabaseMock } = require('../helpers/supabaseMock');

const mockSupabaseAdmin = createSupabaseMock();

jest.mock('../../src/config/supabaseClient', () => ({
  supabaseAdmin: mockSupabaseAdmin,
  supabasePublic: null,
}));

const wishRoutes = require('../../src/routes/wishRoutes');
const { buildTestApp } = require('../helpers/testApp');

const USUARIO = { id: 3, email: 'cliente@bigpecas.com', full_name: 'Maria' };
const PECA = { id: 10, nome_peca: 'Friso Opala', preco: 350, estoque_atual: 2 };

const app = buildTestApp(wishRoutes, { user: { email: 'cliente@bigpecas.com' }, basePath: '/api/wish' });
const appSemUsuario = buildTestApp(wishRoutes, { basePath: '/api/wish' });

/** A primeira consulta em `users` sempre resolve o usuario autenticado. */
function mockarUsuarioAtual(data = USUARIO) {
  mockSupabaseAdmin.__queueTable('users', { data, error: null });
}

describe('wishRoutes', () => {
  beforeEach(() => {
    mockSupabaseAdmin.__reset();
  });

  describe('GET /', () => {
    it('devolve as pecas na ordem da lista de desejos', async () => {
      mockarUsuarioAtual();
      mockSupabaseAdmin.__mockTable('wishlist', {
        data: [{ id: 1, peca_id: 11 }, { id: 2, peca_id: 10 }],
        error: null,
      });
      mockSupabaseAdmin.__mockTable('pecas', {
        data: [PECA, { id: 11, nome_peca: 'Roda Weber' }],
        error: null,
      });

      const resposta = await request(app).get('/api/wish');

      expect(resposta.status).toBe(200);
      expect(resposta.body.total).toBe(2);
      expect(resposta.body.pecas.map((peca) => peca.id)).toEqual([11, 10]);
    });

    it('responde lista vazia sem consultar as pecas', async () => {
      mockarUsuarioAtual();
      mockSupabaseAdmin.__mockTable('wishlist', { data: [], error: null });

      const resposta = await request(app).get('/api/wish');

      expect(resposta.body).toEqual({
        message: 'Sua lista de desejos está vazia.',
        total: 0,
        itens: [],
        pecas: [],
      });
      expect(mockSupabaseAdmin.__callsFor('pecas')).toHaveLength(0);
    });

    it('ignora peca_id repetido ou nulo ao buscar as pecas', async () => {
      mockarUsuarioAtual();
      mockSupabaseAdmin.__mockTable('wishlist', {
        data: [{ peca_id: 10 }, { peca_id: 10 }, { peca_id: null }],
        error: null,
      });
      mockSupabaseAdmin.__mockTable('pecas', { data: [PECA], error: null });

      await request(app).get('/api/wish');

      expect(mockSupabaseAdmin.__callsFor('pecas')[0].argumentos('in')).toEqual(['id', [10]]);
    });

    it('coloca no fim as pecas que nao estao mais na lista', async () => {
      mockarUsuarioAtual();
      mockSupabaseAdmin.__mockTable('wishlist', { data: [{ peca_id: 10 }], error: null });
      mockSupabaseAdmin.__mockTable('pecas', {
        data: [{ id: 99, nome_peca: 'Órfã' }, PECA],
        error: null,
      });

      const resposta = await request(app).get('/api/wish');

      expect(resposta.body.pecas.map((peca) => peca.id)).toEqual([10, 99]);
    });

    it('responde 401 quando a requisicao nao tem usuario autenticado', async () => {
      const resposta = await request(appSemUsuario).get('/api/wish');

      expect(resposta.status).toBe(401);
      expect(resposta.body.error).toContain('e-mail do usuário logado');
    });

    it('responde 404 quando o email autenticado nao existe na tabela users', async () => {
      mockarUsuarioAtual(null);

      const resposta = await request(app).get('/api/wish');

      expect(resposta.status).toBe(404);
      expect(resposta.body.error).toContain('Usuário não encontrado');
    });
  });

  describe('GET /status/:pecaId', () => {
    it('confirma quando a peca esta na lista', async () => {
      mockarUsuarioAtual();
      mockSupabaseAdmin.__mockTable('wishlist', { data: { id: 1, peca_id: 10 }, error: null });

      const resposta = await request(app).get('/api/wish/status/10');

      expect(resposta.body).toEqual({ peca_id: 10, in_wish: true, item: { id: 1, peca_id: 10 } });
    });

    it('informa quando a peca nao esta na lista', async () => {
      mockarUsuarioAtual();
      mockSupabaseAdmin.__mockTable('wishlist', { data: null, error: null });

      const resposta = await request(app).get('/api/wish/status/10');

      expect(resposta.body).toEqual({ peca_id: 10, in_wish: false, item: null });
    });

    it.each(['abc', '0', '-1'])('rejeita o id invalido "%s" com 400', async (pecaId) => {
      mockarUsuarioAtual();

      const resposta = await request(app).get(`/api/wish/status/${pecaId}`);

      expect(resposta.status).toBe(400);
      expect(resposta.body.error).toBe('Informe uma peça válida.');
    });
  });

  describe('POST /:pecaId', () => {
    it('adiciona a peca e responde 201', async () => {
      mockarUsuarioAtual();
      mockSupabaseAdmin.__mockTable('pecas', { data: PECA, error: null });
      mockSupabaseAdmin.__queueTable(
        'wishlist',
        { data: null, error: null },
        { data: { id: 9, user_id: 3, peca_id: 10 }, error: null },
      );

      const resposta = await request(app).post('/api/wish/10');

      expect(resposta.status).toBe(201);
      expect(resposta.body.item).toEqual({ id: 9, user_id: 3, peca_id: 10 });
      expect(resposta.body.peca).toEqual(PECA);

      const insercao = mockSupabaseAdmin.__callsFor('wishlist')[1];
      expect(insercao.argumentos('insert')[0]).toEqual({ user_id: 3, peca_id: 10 });
    });

    it('e idempotente: responde 200 sem inserir de novo', async () => {
      mockarUsuarioAtual();
      mockSupabaseAdmin.__mockTable('pecas', { data: PECA, error: null });
      mockSupabaseAdmin.__mockTable('wishlist', { data: { id: 9, peca_id: 10 }, error: null });

      const resposta = await request(app).post('/api/wish/10');

      expect(resposta.status).toBe(200);
      expect(resposta.body.message).toContain('já está na sua lista');
      expect(mockSupabaseAdmin.__callsFor('wishlist').some((c) => c.operacao('insert'))).toBe(false);
    });

    it('responde 404 quando a peca nao existe', async () => {
      mockarUsuarioAtual();
      mockSupabaseAdmin.__mockTable('pecas', { data: null, error: null });

      const resposta = await request(app).post('/api/wish/10');

      expect(resposta.status).toBe(404);
      expect(resposta.body.error).toBe('Peça não encontrada.');
    });

    it('traduz a violacao de unicidade do Postgres em 409', async () => {
      mockarUsuarioAtual();
      mockSupabaseAdmin.__mockTable('pecas', { data: PECA, error: null });
      mockSupabaseAdmin.__queueTable(
        'wishlist',
        { data: null, error: null },
        { data: null, error: { code: '23505' } },
      );

      const resposta = await request(app).post('/api/wish/10');

      expect(resposta.status).toBe(409);
    });
  });

  describe('DELETE /:pecaId', () => {
    it('remove a peca filtrando por usuario e peca', async () => {
      mockarUsuarioAtual();
      mockSupabaseAdmin.__mockTable('wishlist', { error: null });

      const resposta = await request(app).delete('/api/wish/10');

      expect(resposta.status).toBe(200);
      expect(resposta.body).toEqual({
        message: 'Peça removida da sua lista de desejos.',
        peca_id: 10,
      });

      const [remocao] = mockSupabaseAdmin.__callsFor('wishlist');
      expect(remocao.operations.filter((op) => op.method === 'eq').map((op) => op.args)).toEqual([
        ['user_id', 3],
        ['peca_id', 10],
      ]);
    });

    it('rejeita id invalido antes de tocar no banco', async () => {
      mockarUsuarioAtual();

      const resposta = await request(app).delete('/api/wish/abc');

      expect(resposta.status).toBe(400);
      expect(mockSupabaseAdmin.__callsFor('wishlist')).toHaveLength(0);
    });

    it('propaga falhas do Supabase como 500', async () => {
      mockarUsuarioAtual();
      mockSupabaseAdmin.__mockTable('wishlist', { error: new Error('conexao perdida') });

      const resposta = await request(app).delete('/api/wish/10');

      expect(resposta.status).toBe(500);
      expect(resposta.body.error).toBe('Ocorreu um erro interno. Tente novamente em instantes.');
    });
  });
});
