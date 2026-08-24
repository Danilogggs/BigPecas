const request = require('supertest');
const { createSupabaseMock } = require('../helpers/supabaseMock');

const mockSupabaseAdmin = createSupabaseMock();

jest.mock('../../src/config/supabaseClient', () => ({
  supabaseAdmin: mockSupabaseAdmin,
  supabasePublic: null,
}));

const catalogRoutes = require('../../src/routes/catalogRoutes');
const { buildTestApp } = require('../helpers/testApp');

const app = buildTestApp(catalogRoutes, { basePath: '/api' });

describe('catalogRoutes', () => {
  beforeEach(() => {
    mockSupabaseAdmin.__reset();
  });

  describe.each([
    ['/api/categorias', 'categorias'],
    ['/api/materiais', 'materiais'],
  ])('GET %s', (rota, tabela) => {
    it('lista os registros ordenados por nome', async () => {
      mockSupabaseAdmin.__mockTable(tabela, {
        data: [{ id: 1, nome: 'Aço' }, { id: 2, nome: 'Borracha' }],
        error: null,
      });

      const resposta = await request(app).get(rota);

      expect(resposta.status).toBe(200);
      expect(resposta.body).toEqual([{ id: 1, nome: 'Aço' }, { id: 2, nome: 'Borracha' }]);
      expect(mockSupabaseAdmin.__callsFor(tabela)[0].argumentos('order')).toEqual([
        'nome',
        { ascending: true },
      ]);
    });

    it('devolve lista vazia quando o Supabase retorna null', async () => {
      mockSupabaseAdmin.__mockTable(tabela, { data: null, error: null });

      const resposta = await request(app).get(rota);

      expect(resposta.status).toBe(200);
      expect(resposta.body).toEqual([]);
    });

    it('converte a tabela ausente em 503 com mensagem amigavel', async () => {
      mockSupabaseAdmin.__mockTable(tabela, { data: null, error: { code: '42P01' } });

      const resposta = await request(app).get(rota);

      expect(resposta.status).toBe(503);
      expect(resposta.body.error).toContain('tabela necessária');
    });
  });
});
