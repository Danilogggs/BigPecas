const request = require('supertest');
const { createSupabaseMock } = require('../helpers/supabaseMock');

const mockSupabaseAdmin = createSupabaseMock();
const mockSincronizarStatusVendas = jest.fn(async () => undefined);

jest.mock('../../src/config/supabaseClient', () => ({
  supabaseAdmin: mockSupabaseAdmin,
  supabasePublic: null,
}));

jest.mock('../../src/services/vendasService', () => ({
  sincronizarStatusVendas: mockSincronizarStatusVendas,
}));

const adminRoutes = require('../../src/routes/adminRoutes');
const { buildTestApp } = require('../helpers/testApp');

const ADMIN = { id: 7, email: 'admin@bigpecas.com', full_name: 'Admin', is_admin: true };

const app = buildTestApp(adminRoutes, {
  user: { email: ADMIN.email },
  admin: ADMIN,
  basePath: '/api/admin',
});

function consultaEm(tabela, indice = 0) {
  return mockSupabaseAdmin.__callsFor(tabela)[indice];
}

describe('adminRoutes', () => {
  beforeEach(() => {
    mockSupabaseAdmin.__reset();
    mockSupabaseAdmin.auth.admin.createUser.mockReset();
    mockSupabaseAdmin.auth.admin.deleteUser.mockReset();
    mockSincronizarStatusVendas.mockResolvedValue(undefined);
  });

  describe('GET /me', () => {
    it('devolve o administrador resolvido pelo middleware', async () => {
      const resposta = await request(app).get('/api/admin/me');

      expect(resposta.status).toBe(200);
      expect(resposta.body).toEqual({ admin: ADMIN });
    });
  });

  describe('GET /dashboard', () => {
    it('agrega as contagens e soma as avaliacoes dos dois tipos', async () => {
      mockSupabaseAdmin.__queueTable('users', { count: 120, error: null }, { count: 3, error: null });
      mockSupabaseAdmin.__mockTable('pecas', { count: 540, error: null });
      mockSupabaseAdmin.__queueTable('pedidos', { count: 88, error: null }, { count: 12, error: null });
      mockSupabaseAdmin.__mockTable('avaliacoes_produto', { count: 30, error: null });
      mockSupabaseAdmin.__mockTable('avaliacoes_fornecedor', { count: 11, error: null });

      const resposta = await request(app).get('/api/admin/dashboard');

      expect(resposta.status).toBe(200);
      expect(resposta.body).toEqual({
        usuarios: 120,
        administradores: 3,
        pecas: 540,
        pedidos: 88,
        pedidos_pendentes: 12,
        avaliacoes: 41,
      });
    });

    it('trata contagem nula como zero', async () => {
      mockSupabaseAdmin.__mockTable('users', { count: null, error: null });
      mockSupabaseAdmin.__mockTable('pecas', { count: null, error: null });
      mockSupabaseAdmin.__mockTable('pedidos', { count: null, error: null });
      mockSupabaseAdmin.__mockTable('avaliacoes_produto', { count: null, error: null });
      mockSupabaseAdmin.__mockTable('avaliacoes_fornecedor', { count: null, error: null });

      const resposta = await request(app).get('/api/admin/dashboard');

      expect(resposta.body).toEqual({
        usuarios: 0,
        administradores: 0,
        pecas: 0,
        pedidos: 0,
        pedidos_pendentes: 0,
        avaliacoes: 0,
      });
    });

    it('conta como pendentes os pedidos ainda nao finalizados', async () => {
      mockSupabaseAdmin.__mockTable('users', { count: 0, error: null });
      mockSupabaseAdmin.__mockTable('pecas', { count: 0, error: null });
      mockSupabaseAdmin.__mockTable('pedidos', { count: 0, error: null });
      mockSupabaseAdmin.__mockTable('avaliacoes_produto', { count: 0, error: null });
      mockSupabaseAdmin.__mockTable('avaliacoes_fornecedor', { count: 0, error: null });

      await request(app).get('/api/admin/dashboard');

      expect(consultaEm('pedidos', 1).argumentos('in')).toEqual([
        'status',
        ['aguardando_pagamento', 'pago', 'enviado'],
      ]);
    });

    it('devolve 503 quando uma das tabelas nao existe', async () => {
      mockSupabaseAdmin.__mockTable('users', { count: 1, error: null });
      mockSupabaseAdmin.__mockTable('pecas', { count: null, error: { code: '42P01' } });
      mockSupabaseAdmin.__mockTable('pedidos', { count: 1, error: null });
      mockSupabaseAdmin.__mockTable('avaliacoes_produto', { count: 1, error: null });
      mockSupabaseAdmin.__mockTable('avaliacoes_fornecedor', { count: 1, error: null });

      expect((await request(app).get('/api/admin/dashboard')).status).toBe(503);
    });
  });

  describe('preferencias do painel', () => {
    it('devolve os widgets padrao quando o admin ainda nao personalizou', async () => {
      mockSupabaseAdmin.__mockTable('admin_dashboard_preferences', { data: null, error: null });

      const resposta = await request(app).get('/api/admin/preferencias');

      expect(resposta.body).toEqual({
        config: { widgets: ['boas_vindas', 'faturamento', 'pedidos', 'ticket_medio', 'taxa_conclusao', 'desempenho_vendas', 'requer_atencao', 'fluxo_pedidos', 'resumo_plataforma', 'atividade_recente'] },
        updated_at: null,
      });
    });

    it('devolve a configuracao salva do admin', async () => {
      mockSupabaseAdmin.__mockTable('admin_dashboard_preferences', {
        data: { config: { widgets: ['usuarios'] }, updated_at: '2026-02-01T00:00:00.000Z' },
        error: null,
      });

      const resposta = await request(app).get('/api/admin/preferencias');

      expect(resposta.body.config).toEqual({ widgets: ['usuarios'] });
      expect(consultaEm('admin_dashboard_preferences').argumentos('eq')).toEqual(['user_id', 7]);
    });

    it('salva os widgets escolhidos usando upsert por usuario', async () => {
      mockSupabaseAdmin.__mockTable('admin_dashboard_preferences', {
        data: { config: { widgets: ['usuarios', 'pecas'] }, updated_at: '2026-02-01T00:00:00.000Z' },
        error: null,
      });

      const resposta = await request(app)
        .put('/api/admin/preferencias')
        .send({ widgets: ['usuarios', 'pecas'] });

      expect(resposta.status).toBe(200);
      expect(resposta.body.message).toBe('Painel personalizado com sucesso.');

      const consulta = consultaEm('admin_dashboard_preferences');
      expect(consulta.argumentos('upsert')[0]).toMatchObject({
        user_id: 7,
        config: { widgets: ['usuarios', 'pecas'] },
      });
      expect(consulta.argumentos('upsert')[1]).toEqual({ onConflict: 'user_id' });
    });

    it.each([
      ['lista vazia', []],
      ['nao e lista', 'usuarios'],
      ['widgets demais', ['boas_vindas', 'usuarios', 'administradores', 'pecas', 'pedidos', 'pedidos_pendentes', 'avaliacoes', 'fluxo_pedidos', 'estoque_baixo', 'atividade_recente', 'seguranca', 'faturamento', 'ticket_medio', 'taxa_conclusao', 'taxa_cancelamento', 'desempenho_vendas', 'produtos_top', 'extra']],
    ])('recusa configuracao com %s', async (_descricao, widgets) => {
      const resposta = await request(app).put('/api/admin/preferencias').send({ widgets });

      expect(resposta.status).toBe(400);
      expect(resposta.body.error).toContain('Escolha entre 1 e 16 widgets');
    });

    it.each([
      ['widget desconhecido', ['usuarios', 'produto_desconhecido']],
      ['widget repetido', ['usuarios', 'usuarios']],
    ])('recusa %s', async (_descricao, widgets) => {
      const resposta = await request(app).put('/api/admin/preferencias').send({ widgets });

      expect(resposta.status).toBe(400);
      expect(resposta.body.error).toContain('widgets invalidos ou repetidos');
    });
  });

  describe('GET /usuarios', () => {
    it('pagina com valores padrao', async () => {
      mockSupabaseAdmin.__mockTable('users', { data: [ADMIN], count: 1, error: null });

      const resposta = await request(app).get('/api/admin/usuarios');

      expect(resposta.body.pagination).toEqual({ page: 1, limit: 20, total: 1 });
      expect(consultaEm('users').argumentos('range')).toEqual([0, 19]);
    });

    it.each([
      ['page=3&limit=10', { page: 3, limit: 10 }, [20, 29]],
      ['limit=500', { page: 1, limit: 100 }, [0, 99]],
      ['page=abc', { page: 1, limit: 20 }, [0, 19]],
      ['page=-2', { page: 1, limit: 20 }, [0, 19]],
    ])('normaliza a paginacao de %s', async (query, paginacao, intervalo) => {
      mockSupabaseAdmin.__mockTable('users', { data: [], count: 0, error: null });

      const resposta = await request(app).get(`/api/admin/usuarios?${query}`);

      expect(resposta.body.pagination).toMatchObject(paginacao);
      expect(consultaEm('users').argumentos('range')).toEqual(intervalo);
    });

    it('busca por email, nome e loja ao mesmo tempo', async () => {
      mockSupabaseAdmin.__mockTable('users', { data: [], count: 0, error: null });

      await request(app).get('/api/admin/usuarios?search=maria');

      expect(consultaEm('users').argumentos('or')[0]).toBe(
        'email.ilike.%maria%,full_name.ilike.%maria%,nome_loja.ilike.%maria%',
      );
    });

    it('remove caracteres que quebrariam o filtro `or` do PostgREST', async () => {
      mockSupabaseAdmin.__mockTable('users', { data: [], count: 0, error: null });

      await request(app).get('/api/admin/usuarios?search=%25maria%2C(x)');

      expect(consultaEm('users').argumentos('or')[0]).toBe(
        'email.ilike.%mariax%,full_name.ilike.%mariax%,nome_loja.ilike.%mariax%',
      );
    });

    it('nao filtra quando a busca fica vazia depois da limpeza', async () => {
      mockSupabaseAdmin.__mockTable('users', { data: [], count: 0, error: null });

      await request(app).get('/api/admin/usuarios?search=%20%20');

      expect(consultaEm('users').operacao('or')).toBeNull();
    });

    it.each([
      ['true', true],
      ['false', false],
    ])('filtra por is_admin=%s', async (valor, esperado) => {
      mockSupabaseAdmin.__mockTable('users', { data: [], count: 0, error: null });

      await request(app).get(`/api/admin/usuarios?is_admin=${valor}`);

      expect(consultaEm('users').argumentos('eq')).toEqual(['is_admin', esperado]);
    });

    it('ignora valores de is_admin que nao sejam true/false', async () => {
      mockSupabaseAdmin.__mockTable('users', { data: [], count: 0, error: null });

      await request(app).get('/api/admin/usuarios?is_admin=talvez');

      expect(consultaEm('users').operacao('eq')).toBeNull();
    });
  });

  describe('POST /usuarios/admin', () => {
    const cadastro = { full_name: 'Nova Administradora', email: 'NOVA@BIGPECAS.COM', password: 'segura123' };

    it('cria uma conta confirmada no Auth e um perfil administrador', async () => {
      mockSupabaseAdmin.__queueTable(
        'users',
        { data: null, error: null },
        { data: { id: 10, email: 'nova@bigpecas.com', full_name: 'Nova Administradora', is_admin: true }, error: null },
      );
      mockSupabaseAdmin.auth.admin.createUser.mockResolvedValue({ data: { user: { id: 'auth-10' } }, error: null });

      const resposta = await request(app).post('/api/admin/usuarios/admin').send(cadastro);

      expect(resposta.status).toBe(201);
      expect(resposta.body.usuario).toMatchObject({ email: 'nova@bigpecas.com', is_admin: true });
      expect(mockSupabaseAdmin.auth.admin.createUser).toHaveBeenCalledWith(expect.objectContaining({
        email: 'nova@bigpecas.com', password: 'segura123', email_confirm: true,
      }));
      expect(consultaEm('users', 1).argumentos('insert')[0]).toMatchObject({
        email: 'nova@bigpecas.com', full_name: 'Nova Administradora', is_admin: true,
        email_verificado: true, tipo_usuario: 'ambos',
      });
    });

    it('recusa email ja usado antes de criar usuario no Auth', async () => {
      mockSupabaseAdmin.__mockTable('users', { data: { id: 5, email: 'nova@bigpecas.com' }, error: null });

      const resposta = await request(app).post('/api/admin/usuarios/admin').send(cadastro);

      expect(resposta.status).toBe(409);
      expect(mockSupabaseAdmin.auth.admin.createUser).not.toHaveBeenCalled();
    });

    it('remove o usuario do Auth se a gravacao do perfil falhar', async () => {
      mockSupabaseAdmin.__queueTable(
        'users',
        { data: null, error: null },
        { data: null, error: { message: 'falha no banco' } },
      );
      mockSupabaseAdmin.auth.admin.createUser.mockResolvedValue({ data: { user: { id: 'auth-10' } }, error: null });
      mockSupabaseAdmin.auth.admin.deleteUser.mockResolvedValue({ data: {}, error: null });

      expect((await request(app).post('/api/admin/usuarios/admin').send(cadastro)).status).toBe(500);
      expect(mockSupabaseAdmin.auth.admin.deleteUser).toHaveBeenCalledWith('auth-10');
    });

    it.each([
      [{ ...cadastro, full_name: 'A' }, 'nome'],
      [{ ...cadastro, email: 'invalido' }, 'email'],
      [{ ...cadastro, password: 'curta' }, 'senha'],
    ])('valida os dados antes de criar a conta (%s)', async (dados) => {
      const resposta = await request(app).post('/api/admin/usuarios/admin').send(dados);
      expect(resposta.status).toBe(400);
      expect(mockSupabaseAdmin.auth.admin.createUser).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /usuarios/:id/admin', () => {
    it('promove um usuario a administrador', async () => {
      mockSupabaseAdmin.__mockTable('users', {
        data: { id: 9, email: 'novo@bigpecas.com', is_admin: true },
        error: null,
      });

      const resposta = await request(app).patch('/api/admin/usuarios/9/admin').send({ is_admin: true });

      expect(resposta.status).toBe(200);
      expect(resposta.body.usuario.is_admin).toBe(true);
      expect(consultaEm('users').argumentos('update')[0]).toMatchObject({ is_admin: true });
    });

    it('rebaixa um administrador quando ainda restam outros', async () => {
      mockSupabaseAdmin.__queueTable(
        'users',
        { count: 3, error: null },
        { data: { id: 9, is_admin: false }, error: null },
      );

      const resposta = await request(app).patch('/api/admin/usuarios/9/admin').send({ is_admin: false });

      expect(resposta.status).toBe(200);
      expect(resposta.body.usuario.is_admin).toBe(false);
    });

    it('impede remover o ultimo administrador', async () => {
      mockSupabaseAdmin.__queueTable('users', { count: 1, error: null });

      const resposta = await request(app).patch('/api/admin/usuarios/9/admin').send({ is_admin: false });

      expect(resposta.status).toBe(409);
      expect(resposta.body.error).toBe('Nao e permitido remover o ultimo administrador.');
      expect(mockSupabaseAdmin.__callsFor('users')).toHaveLength(1);
    });

    it.each([['sim'], [1], [undefined], [null]])(
      'exige is_admin booleano, recusando %p',
      async (is_admin) => {
        const resposta = await request(app).patch('/api/admin/usuarios/9/admin').send({ is_admin });

        expect(resposta.status).toBe(400);
        expect(resposta.body.error).toBe('Informe is_admin como true ou false.');
      },
    );

    it('valida o id do usuario', async () => {
      const resposta = await request(app).patch('/api/admin/usuarios/abc/admin').send({ is_admin: true });

      expect(resposta.status).toBe(400);
      expect(resposta.body.error).toBe('O id de usuario e invalido.');
    });

    it('responde 404 quando o usuario nao existe', async () => {
      mockSupabaseAdmin.__mockTable('users', { data: null, error: null });

      const resposta = await request(app).patch('/api/admin/usuarios/9/admin').send({ is_admin: true });

      expect(resposta.status).toBe(404);
      expect(resposta.body.error).toBe('Usuario nao encontrado.');
    });
  });

  describe('pecas', () => {
    it('lista com busca por nome, sku e oem', async () => {
      mockSupabaseAdmin.__mockTable('pecas', { data: [], count: 0, error: null });

      await request(app).get('/api/admin/pecas?search=friso');

      expect(consultaEm('pecas').argumentos('or')[0]).toBe(
        'nome_peca.ilike.%friso%,sku.ilike.%friso%,oem_number.ilike.%friso%',
      );
    });

    it('remove a peca e confirma qual foi removida', async () => {
      mockSupabaseAdmin.__mockTable('pecas', { data: { id: 10, nome_peca: 'Friso' }, error: null });

      const resposta = await request(app).delete('/api/admin/pecas/10');

      expect(resposta.status).toBe(200);
      expect(resposta.body).toEqual({
        message: 'Peca removida pelo administrador.',
        peca: { id: 10, nome_peca: 'Friso' },
      });
    });

    it('responde 404 ao remover peca inexistente', async () => {
      mockSupabaseAdmin.__mockTable('pecas', { data: null, error: null });

      expect((await request(app).delete('/api/admin/pecas/10')).status).toBe(404);
    });

    it('valida o id da peca', async () => {
      const resposta = await request(app).delete('/api/admin/pecas/0');

      expect(resposta.status).toBe(400);
      expect(resposta.body.error).toBe('O id de peca e invalido.');
    });
  });

  describe('pedidos', () => {
    it('filtra por status valido', async () => {
      mockSupabaseAdmin.__mockTable('pedidos', { data: [], count: 0, error: null });

      await request(app).get('/api/admin/pedidos?status=pago');

      expect(consultaEm('pedidos').argumentos('eq')).toEqual(['status', 'pago']);
    });

    it('recusa status desconhecido na listagem', async () => {
      const resposta = await request(app).get('/api/admin/pedidos?status=perdido');

      expect(resposta.status).toBe(400);
      expect(resposta.body.error).toBe('Status de pedido invalido.');
    });

    it('atualiza o status sem respeitar a maquina de estados do fluxo normal', async () => {
      const pedidoFinal = { id: '2026-1', status: 'entregue', historico: [] };
      mockSupabaseAdmin.__queueTable(
        'pedidos',
        { data: { id: '2026-1', historico: [{ status: 'pago', data: '2026-01-01T00:00:00.000Z' }] }, error: null },
        { data: pedidoFinal, error: null },
      );

      const resposta = await request(app)
        .patch('/api/admin/pedidos/2026-1/status')
        .send({ status: 'entregue' });

      expect(resposta.status).toBe(200);
      expect(resposta.body.pedido).toEqual(pedidoFinal);
      expect(mockSincronizarStatusVendas).toHaveBeenCalledWith(pedidoFinal);
    });

    it('registra no historico qual admin fez a alteracao', async () => {
      mockSupabaseAdmin.__queueTable(
        'pedidos',
        { data: { id: '2026-1', historico: [{ status: 'pago' }] }, error: null },
        { data: { id: '2026-1', status: 'cancelado' }, error: null },
      );

      await request(app).patch('/api/admin/pedidos/2026-1/status').send({ status: 'cancelado' });

      const historico = consultaEm('pedidos', 1).argumentos('update')[0].historico;
      expect(historico).toHaveLength(2);
      expect(historico[1]).toMatchObject({ status: 'cancelado', alterado_por_admin: 7 });
    });

    it('inicia o historico quando o pedido nao tinha um', async () => {
      mockSupabaseAdmin.__queueTable(
        'pedidos',
        { data: { id: '2026-1', historico: null }, error: null },
        { data: { id: '2026-1', status: 'pago' }, error: null },
      );

      await request(app).patch('/api/admin/pedidos/2026-1/status').send({ status: 'pago' });

      expect(consultaEm('pedidos', 1).argumentos('update')[0].historico).toHaveLength(1);
    });

    it('recusa status invalido na atualizacao', async () => {
      const resposta = await request(app)
        .patch('/api/admin/pedidos/2026-1/status')
        .send({ status: 'sumiu' });

      expect(resposta.status).toBe(400);
      expect(mockSupabaseAdmin.__callsFor('pedidos')).toHaveLength(0);
    });

    it('responde 404 quando o pedido nao existe', async () => {
      mockSupabaseAdmin.__queueTable('pedidos', { data: null, error: null });

      const resposta = await request(app)
        .patch('/api/admin/pedidos/inexistente/status')
        .send({ status: 'pago' });

      expect(resposta.status).toBe(404);
    });
  });

  describe('avaliacoes', () => {
    it.each([
      ['produtos', 'avaliacoes_produto'],
      ['fornecedores', 'avaliacoes_fornecedor'],
    ])('lista as avaliacoes de %s na tabela correta', async (tipo, tabela) => {
      mockSupabaseAdmin.__mockTable(tabela, { data: [{ id: 1 }], count: 1, error: null });

      const resposta = await request(app).get(`/api/admin/avaliacoes/${tipo}`);

      expect(resposta.status).toBe(200);
      expect(resposta.body.data).toEqual([{ id: 1 }]);
      expect(consultaEm(tabela).argumentos('order')).toEqual(['data_avaliacao', { ascending: false }]);
    });

    it('recusa tipo desconhecido', async () => {
      const resposta = await request(app).get('/api/admin/avaliacoes/vendedores');

      expect(resposta.status).toBe(400);
      expect(resposta.body.error).toBe('Use produtos ou fornecedores como tipo.');
    });

    it('remove uma avaliacao de produto', async () => {
      mockSupabaseAdmin.__mockTable('avaliacoes_produto', { data: { id: 3 }, error: null });

      const resposta = await request(app).delete('/api/admin/avaliacoes/produtos/3');

      expect(resposta.status).toBe(200);
      expect(resposta.body).toEqual({ message: 'Avaliacao removida pelo administrador.' });
    });

    it('responde 404 ao remover avaliacao inexistente', async () => {
      mockSupabaseAdmin.__mockTable('avaliacoes_fornecedor', { data: null, error: null });

      expect((await request(app).delete('/api/admin/avaliacoes/fornecedores/3')).status).toBe(404);
    });

    it('valida o id da avaliacao', async () => {
      const resposta = await request(app).delete('/api/admin/avaliacoes/produtos/abc');

      expect(resposta.status).toBe(400);
      expect(resposta.body.error).toBe('O id de avaliacao e invalido.');
    });
  });
});
