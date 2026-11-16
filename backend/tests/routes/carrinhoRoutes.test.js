const request = require('supertest');
const { createSupabaseMock } = require('../helpers/supabaseMock');

const mockSupabaseAdmin = createSupabaseMock();

jest.mock('../../src/config/supabaseClient', () => ({
  supabaseAdmin: mockSupabaseAdmin,
  supabasePublic: null,
}));

const carrinhoRoutes = require('../../src/routes/carrinhoRoutes');
const { buildTestApp } = require('../helpers/testApp');

const USUARIO = { id: 3, email: 'cliente@bigpecas.com' };
const FRISO = { id: 10, nome_peca: 'Friso Opala', preco: 350, imagem: 'friso.png', estoque_atual: 2, sku: 'FR-1' };
const RODA = { id: 11, nome_peca: 'Roda Weber', preco: 900, imagem: null, estoque_atual: 0, sku: 'RD-1' };

const app = buildTestApp(carrinhoRoutes, { user: { email: 'cliente@bigpecas.com' }, basePath: '/api/carrinho' });
const appSemUsuario = buildTestApp(carrinhoRoutes, { basePath: '/api/carrinho' });

function mockarUsuarioAtual(data = USUARIO) {
  mockSupabaseAdmin.__queueTable('users', { data, error: null });
}

describe('carrinhoRoutes', () => {
  beforeEach(() => {
    mockSupabaseAdmin.__reset();
  });

  describe('GET /', () => {
    it('devolve os itens com os dados atuais da peca e sem pecas esgotadas', async () => {
      mockarUsuarioAtual();
      mockSupabaseAdmin.__mockTable('carrinhos', {
        data: { itens: [{ peca_id: 10, quantidade: 5 }, { peca_id: 11, quantidade: 1 }], updated_at: '2026-10-26T10:00:00Z' },
        error: null,
      });
      mockSupabaseAdmin.__mockTable('pecas', { data: [FRISO, RODA], error: null });

      const response = await request(app).get('/api/carrinho');

      expect(response.status).toBe(200);
      expect(response.body.atualizado_em).toBe('2026-10-26T10:00:00Z');
      expect(response.body.itens).toEqual([expect.objectContaining({
        id: 10, nome: 'Friso Opala', preco: 350, estoque: 2, quantidade: 2,
      })]);
      expect(mockSupabaseAdmin.__callsFor('pecas')[0].argumentos('in')).toEqual(['id', [10, 11]]);
    });

    it('devolve carrinho vazio sem data quando o usuario nunca salvou', async () => {
      mockarUsuarioAtual();
      mockSupabaseAdmin.__mockTable('carrinhos', { data: null, error: null });

      const response = await request(app).get('/api/carrinho');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ itens: [], atualizado_em: null });
      expect(mockSupabaseAdmin.__callsFor('pecas')).toHaveLength(0);
    });

    it('nao consulta pecas quando o carrinho salvo esta vazio', async () => {
      mockarUsuarioAtual();
      mockSupabaseAdmin.__mockTable('carrinhos', { data: { itens: [], updated_at: 'x' }, error: null });

      const response = await request(app).get('/api/carrinho');

      expect(response.body).toEqual({ itens: [], atualizado_em: 'x' });
      expect(mockSupabaseAdmin.__callsFor('pecas')).toHaveLength(0);
    });

    it('responde 401 sem e-mail do usuario autenticado', async () => {
      const response = await request(appSemUsuario).get('/api/carrinho');
      expect(response.status).toBe(401);
    });

    it('responde 404 quando o usuario nao existe na tabela users', async () => {
      mockarUsuarioAtual(null);
      const response = await request(app).get('/api/carrinho');
      expect(response.status).toBe(404);
    });
  });

  describe('PUT /', () => {
    it('salva apenas peca e quantidade, sem duplicar pecas', async () => {
      mockarUsuarioAtual();
      mockSupabaseAdmin.__mockTable('carrinhos', { data: { updated_at: '2026-10-26T11:00:00Z' }, error: null });

      const response = await request(app).put('/api/carrinho').send({
        itens: [
          { id: 10, quantidade: 1, nome: 'Friso', imagem: 'data:image/png;base64,AAAA' },
          { id: 10, quantidade: 2 },
          { id: 'x', quantidade: 1 },
          { id: 12, quantidade: 0 },
        ],
      });

      expect(response.status).toBe(200);
      expect(response.body.atualizado_em).toBe('2026-10-26T11:00:00Z');
      const [upsert] = mockSupabaseAdmin.__callsFor('carrinhos')[0].argumentos('upsert');
      expect(upsert).toEqual(expect.objectContaining({ user_id: 3, itens: [{ peca_id: 10, quantidade: 2 }] }));
    });

    it('rejeita corpo sem lista de itens', async () => {
      mockarUsuarioAtual();
      const response = await request(app).put('/api/carrinho').send({});
      expect(response.status).toBe(400);
    });

    it('rejeita carrinho com pecas demais', async () => {
      mockarUsuarioAtual();
      const itens = Array.from({ length: 51 }, (_, index) => ({ id: index + 1, quantidade: 1 }));
      const response = await request(app).put('/api/carrinho').send({ itens });
      expect(response.status).toBe(400);
    });

    it('propaga erro do banco', async () => {
      mockarUsuarioAtual();
      mockSupabaseAdmin.__mockTable('carrinhos', { data: null, error: { message: 'falhou' } });
      const response = await request(app).put('/api/carrinho').send({ itens: [] });
      expect(response.status).toBe(500);
    });
  });
});
