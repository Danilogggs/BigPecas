const request = require('supertest');
const { createSupabaseMock } = require('../helpers/supabaseMock');

const mockSupabaseAdmin = createSupabaseMock();

jest.mock('../../src/config/supabaseClient', () => ({
  supabaseAdmin: mockSupabaseAdmin,
  supabasePublic: null,
}));

// A autenticacao ja e coberta em tests/middlewares/verifyToken.test.js; aqui o
// usuario e injetado direto no request, como o middleware faz em producao.
jest.mock('../../src/middlewares/verifyToken', () => (_req, _res, next) => next());

const notificacoesRoutes = require('../../src/routes/notificacoesRoutes');
const { buildTestApp } = require('../helpers/testApp');

const USUARIO = { id: 3, email: 'cliente@bigpecas.com' };

const NOTIFICACAO = {
  id: 77,
  user_id: 3,
  pedido_id: '2026-1',
  tipo: 'pedido_pago',
  titulo: 'Pagamento confirmado',
  mensagem: 'Seu pedido foi pago.',
  lida_em: null,
};

function criarApp(user = { email: USUARIO.email }) {
  return buildTestApp(notificacoesRoutes, { user, basePath: '/api/notificacoes' });
}

const app = criarApp();

/** A primeira consulta em `users` sempre resolve o usuario autenticado. */
function mockarUsuarioAtual(data = USUARIO) {
  mockSupabaseAdmin.__queueTable('users', { data, error: null });
}

describe('notificacoesRoutes', () => {
  beforeEach(() => {
    mockSupabaseAdmin.__reset();
  });

  describe('GET /nao-lidas/count', () => {
    it('conta somente as notificacoes ainda nao lidas do usuario', async () => {
      mockarUsuarioAtual();
      mockSupabaseAdmin.__mockTable('notificacoes', { data: null, error: null, count: 4 });

      const resposta = await request(app).get('/api/notificacoes/nao-lidas/count');

      expect(resposta.status).toBe(200);
      expect(resposta.body).toEqual({ count: 4 });

      const [consulta] = mockSupabaseAdmin.__callsFor('notificacoes');
      expect(consulta.argumentos('eq')).toEqual(['user_id', '3']);
      expect(consulta.argumentos('is')).toEqual(['lida_em', null]);
    });

    it('devolve zero quando o Supabase nao informa a contagem', async () => {
      mockarUsuarioAtual();
      mockSupabaseAdmin.__mockTable('notificacoes', { data: null, error: null, count: null });

      const resposta = await request(app).get('/api/notificacoes/nao-lidas/count');

      expect(resposta.body).toEqual({ count: 0 });
    });

    it('propaga a falha do Supabase como 500', async () => {
      mockarUsuarioAtual();
      mockSupabaseAdmin.__mockTable('notificacoes', { data: null, error: new Error('falhou') });

      const resposta = await request(app).get('/api/notificacoes/nao-lidas/count');

      expect(resposta.status).toBe(500);
    });
  });

  describe('GET /', () => {
    it('lista as notificacoes mais recentes primeiro, limitadas a 50', async () => {
      mockarUsuarioAtual();
      mockSupabaseAdmin.__mockTable('notificacoes', { data: [NOTIFICACAO], error: null });

      const resposta = await request(app).get('/api/notificacoes');

      expect(resposta.status).toBe(200);
      expect(resposta.body).toEqual({ notificacoes: [NOTIFICACAO] });

      const [consulta] = mockSupabaseAdmin.__callsFor('notificacoes');
      expect(consulta.argumentos('order')).toEqual(['criada_em', { ascending: false }]);
      expect(consulta.argumentos('limit')).toEqual([50]);
    });

    it('devolve uma lista vazia quando nao ha notificacoes', async () => {
      mockarUsuarioAtual();
      mockSupabaseAdmin.__mockTable('notificacoes', { data: null, error: null });

      const resposta = await request(app).get('/api/notificacoes');

      expect(resposta.body).toEqual({ notificacoes: [] });
    });
  });

  describe('PATCH /:id/lida', () => {
    it('marca a notificacao como lida carimbando o horario', async () => {
      mockarUsuarioAtual();
      mockSupabaseAdmin.__mockTable('notificacoes', {
        data: { id: 77, lida_em: '2026-08-31T12:00:00.000Z' },
        error: null,
      });

      const resposta = await request(app).patch('/api/notificacoes/77/lida');

      expect(resposta.status).toBe(200);
      expect(resposta.body.notificacao.id).toBe(77);

      const [consulta] = mockSupabaseAdmin.__callsFor('notificacoes');
      expect(Number.isNaN(Date.parse(consulta.argumentos('update')[0].lida_em))).toBe(false);
      expect(consulta.operations.filter((op) => op.method === 'eq').map((op) => op.args)).toEqual([
        ['id', '77'],
        ['user_id', '3'],
      ]);
    });

    it('responde 404 quando a notificacao nao e do usuario', async () => {
      mockarUsuarioAtual();
      mockSupabaseAdmin.__mockTable('notificacoes', { data: null, error: null });

      const resposta = await request(app).patch('/api/notificacoes/999/lida');

      expect(resposta.status).toBe(404);
      expect(resposta.body.error).toBe('Notificação não encontrada.');
    });
  });

  describe('autenticacao', () => {
    it('responde 401 quando o token nao tem e-mail', async () => {
      const resposta = await request(criarApp({ id: 'sem-email' })).get('/api/notificacoes');

      expect(resposta.status).toBe(401);
      expect(mockSupabaseAdmin.__callsFor('users')).toHaveLength(0);
    });

    it('responde 404 quando o usuario autenticado nao existe na base', async () => {
      mockarUsuarioAtual(null);

      const resposta = await request(app).get('/api/notificacoes');

      expect(resposta.status).toBe(404);
      expect(resposta.body.error).toBe('Usuário não encontrado.');
    });

    it('propaga o erro do Supabase ao resolver o usuario', async () => {
      mockSupabaseAdmin.__queueTable('users', { data: null, error: new Error('indisponivel') });

      const resposta = await request(app).get('/api/notificacoes');

      expect(resposta.status).toBe(500);
    });
  });
});
