const request = require('supertest');
const { createSupabaseMock } = require('../helpers/supabaseMock');

const mockSupabaseAdmin = createSupabaseMock();
const mockSupabasePublic = createSupabaseMock();

jest.mock('../../src/config/supabaseClient', () => ({
  supabaseAdmin: mockSupabaseAdmin,
  supabasePublic: mockSupabasePublic,
}));

// As rotas protegidas usam verifyToken; aqui ele apenas repassa o usuario que o
// teste injetou em `req`, mantendo o foco nos handlers de /auth.
jest.mock('../../src/middlewares/verifyToken', () => (req, res, next) => next());

const authRoutes = require('../../src/routes/authRoutes');
const { buildTestApp } = require('../helpers/testApp');

const AUTH_USER = {
  id: 'uuid-1',
  email: 'cliente@bigpecas.com',
  email_confirmed_at: '2026-01-01T00:00:00.000Z',
  user_metadata: { full_name: 'Maria Silva', nome_loja: 'Loja da Maria' },
};

const PERFIL = {
  id: 42,
  email: 'cliente@bigpecas.com',
  full_name: 'Maria Silva',
  tipo_usuario: 'ambos',
  email_verificado: true,
  is_admin: false,
};

function criarApp(user = AUTH_USER) {
  return buildTestApp(authRoutes, { user, basePath: '/api/auth' });
}

const app = criarApp();

describe('authRoutes', () => {
  beforeEach(() => {
    mockSupabaseAdmin.__reset();
    mockSupabasePublic.__reset();
  });

  describe('GET /health', () => {
    it('confirma que a API de autenticacao esta no ar', async () => {
      const resposta = await request(app).get('/api/auth/health');

      expect(resposta.status).toBe(200);
      expect(resposta.body.status).toBe('ok');
    });
  });

  describe('POST /register', () => {
    const cadastro = {
      full_name: '  Maria Silva  ',
      email: '  Cliente@BigPecas.com ',
      password: 'senha-super-secreta',
      genero: 'feminino',
      cep: '01310100',
      nome_loja: 'Loja da Maria',
    };

    it('cria o usuario no Supabase Auth e o perfil na tabela users', async () => {
      mockSupabaseAdmin.__queueTable(
        'users',
        { data: null, error: null },
        { data: null, error: null },
        { data: PERFIL, error: null },
      );
      mockSupabasePublic.auth.signUp.mockResolvedValue({
        data: { user: { id: 'uuid-1', email: 'cliente@bigpecas.com' } },
        error: null,
      });

      const resposta = await request(app).post('/api/auth/register').send(cadastro);

      expect(resposta.status).toBe(201);
      expect(resposta.body).toMatchObject({
        emailVerificationRequiredForSelling: true,
        authUser: { id: 'uuid-1', email: 'cliente@bigpecas.com' },
        profile: PERFIL,
      });
    });

    it('normaliza email e nome antes de enviar ao Supabase', async () => {
      mockSupabaseAdmin.__queueTable(
        'users',
        { data: null, error: null },
        { data: null, error: null },
        { data: PERFIL, error: null },
      );
      mockSupabasePublic.auth.signUp.mockResolvedValue({
        data: { user: { id: 'uuid-1' } },
        error: null,
      });

      await request(app).post('/api/auth/register').send(cadastro);

      expect(mockSupabasePublic.auth.signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'cliente@bigpecas.com',
          password: 'senha-super-secreta',
          options: expect.objectContaining({
            data: expect.objectContaining({ full_name: 'Maria Silva', gender: 'feminino' }),
          }),
        }),
      );
    });

    it('sempre grava tipo_usuario "ambos", ignorando o que o cliente enviar', async () => {
      mockSupabaseAdmin.__queueTable(
        'users',
        { data: null, error: null },
        { data: null, error: null },
        { data: PERFIL, error: null },
      );
      mockSupabasePublic.auth.signUp.mockResolvedValue({ data: { user: { id: 'uuid-1' } }, error: null });

      await request(app).post('/api/auth/register').send({ ...cadastro, tipo_usuario: 'admin' });

      const insercao = mockSupabaseAdmin.__callsFor('users')[2];
      expect(insercao.argumentos('insert')[0].tipo_usuario).toBe('ambos');
    });

    it.each([
      ['true', true],
      ['false', false],
      ['0', false],
      ['on', true],
      [false, false],
      [undefined, true],
    ])('normaliza receber_email_notificacao_venda=%p em %p', async (valor, esperado) => {
      mockSupabaseAdmin.__queueTable(
        'users',
        { data: null, error: null },
        { data: null, error: null },
        { data: PERFIL, error: null },
      );
      mockSupabasePublic.auth.signUp.mockResolvedValue({ data: { user: { id: 'uuid-1' } }, error: null });

      await request(app)
        .post('/api/auth/register')
        .send({ ...cadastro, receber_email_notificacao_venda: valor });

      const insercao = mockSupabaseAdmin.__callsFor('users')[2];
      expect(insercao.argumentos('insert')[0].receber_email_notificacao_venda).toBe(esperado);
    });

    it.each([
      ['sem nome', { full_name: '' }, 'Informe o nome completo.'],
      ['com email invalido', { email: 'maria@bigpecas' }, 'Informe um email válido.'],
      ['sem email', { email: '' }, 'Informe um email válido.'],
      ['com senha curta', { password: '1234567' }, 'A senha deve ter pelo menos 8 caracteres.'],
      ['sem senha', { password: '' }, 'A senha deve ter pelo menos 8 caracteres.'],
    ])('recusa cadastro %s com 400', async (_descricao, alteracao, mensagem) => {
      const resposta = await request(app).post('/api/auth/register').send({ ...cadastro, ...alteracao });

      expect(resposta.status).toBe(400);
      expect(resposta.body.error).toBe(mensagem);
      expect(mockSupabasePublic.auth.signUp).not.toHaveBeenCalled();
    });

    it('recusa email ja cadastrado com 409 antes de chamar o signUp', async () => {
      mockSupabaseAdmin.__queueTable('users', { data: PERFIL, error: null });

      const resposta = await request(app).post('/api/auth/register').send(cadastro);

      expect(resposta.status).toBe(409);
      expect(resposta.body.error).toBe('Este email já está cadastrado.');
      expect(mockSupabasePublic.auth.signUp).not.toHaveBeenCalled();
    });

    it('traduz o erro de email duplicado vindo do Supabase Auth', async () => {
      mockSupabaseAdmin.__queueTable('users', { data: null, error: null });
      mockSupabasePublic.auth.signUp.mockResolvedValue({
        data: null,
        error: { code: 'email_exists', message: 'User already registered' },
      });

      const resposta = await request(app).post('/api/auth/register').send(cadastro);

      expect(resposta.status).toBe(409);
    });

    it('responde 500 quando o Supabase nao devolve um usuario', async () => {
      mockSupabaseAdmin.__queueTable('users', { data: null, error: null });
      mockSupabasePublic.auth.signUp.mockResolvedValue({ data: { user: null }, error: null });

      const resposta = await request(app).post('/api/auth/register').send(cadastro);

      expect(resposta.status).toBe(500);
      expect(resposta.body.error).toBe('Não foi possível criar o usuário no Supabase.');
    });

    it('responde 503 quando a chave anonima do Supabase nao esta configurada', async () => {
      jest.resetModules();
      jest.doMock('../../src/config/supabaseClient', () => ({
        supabaseAdmin: mockSupabaseAdmin,
        supabasePublic: null,
      }));
      jest.doMock('../../src/middlewares/verifyToken', () => (req, res, next) => next());

      const appSemAnonKey = buildTestApp(require('../../src/routes/authRoutes'), {
        user: AUTH_USER,
        basePath: '/api/auth',
      });

      try {
        const resposta = await request(appSemAnonKey).post('/api/auth/register').send(cadastro);

        expect(resposta.status).toBe(503);
        expect(resposta.body.error).toContain('SUPABASE_ANON_KEY');
      } finally {
        jest.resetModules();
      }
    });
  });

  describe('GET /me', () => {
    it('devolve o perfil do usuario autenticado', async () => {
      mockSupabaseAdmin.__mockTable('users', { data: PERFIL, error: null });

      const resposta = await request(app).get('/api/auth/me');

      expect(resposta.status).toBe(200);
      expect(resposta.body.user).toMatchObject({ id: 'uuid-1', email: 'cliente@bigpecas.com' });
      expect(resposta.body.user.profile).toMatchObject({ tipo_usuario: 'ambos', is_admin: false });
    });

    it('marca o email como verificado no banco depois da confirmacao no Auth', async () => {
      mockSupabaseAdmin.__queueTable(
        'users',
        { data: { ...PERFIL, email_verificado: false }, error: null },
        { data: { ...PERFIL, email_verificado: true }, error: null },
      );

      const resposta = await request(app).get('/api/auth/me');

      expect(resposta.body.user.profile.email_verificado).toBe(true);
      expect(mockSupabaseAdmin.__callsFor('users')[1].argumentos('update')[0]).toMatchObject({
        email_verificado: true,
      });
    });

    it('nao regrava o perfil quando o email ja estava verificado', async () => {
      mockSupabaseAdmin.__mockTable('users', { data: PERFIL, error: null });

      await request(app).get('/api/auth/me');

      expect(mockSupabaseAdmin.__callsFor('users')).toHaveLength(1);
    });

    it('monta um perfil a partir do metadata quando o usuario nao esta na tabela', async () => {
      mockSupabaseAdmin.__mockTable('users', { data: null, error: null });

      const resposta = await request(app).get('/api/auth/me');

      expect(resposta.body.user.profile).toMatchObject({
        full_name: 'Maria Silva',
        nome_loja: 'Loja da Maria',
        email: 'cliente@bigpecas.com',
        tipo_usuario: 'ambos',
        email_verificado: true,
        is_admin: false,
      });
    });

    it('nunca marca is_admin no perfil de fallback', async () => {
      mockSupabaseAdmin.__mockTable('users', { data: null, error: null });

      const appComMetadataAdmin = criarApp({
        ...AUTH_USER,
        user_metadata: { ...AUTH_USER.user_metadata, is_admin: true },
      });

      const resposta = await request(appComMetadataAdmin).get('/api/auth/me');

      expect(resposta.body.user.profile.is_admin).toBe(false);
    });

    it('normaliza is_admin para booleano', async () => {
      mockSupabaseAdmin.__mockTable('users', { data: { ...PERFIL, is_admin: 'sim' }, error: null });

      const resposta = await request(app).get('/api/auth/me');

      expect(resposta.body.user.profile.is_admin).toBe(false);
    });
  });

  describe('GET /profile', () => {
    it('devolve o perfil salvo', async () => {
      mockSupabaseAdmin.__mockTable('users', { data: PERFIL, error: null });

      const resposta = await request(app).get('/api/auth/profile');

      expect(resposta.status).toBe(200);
      expect(resposta.body).toMatchObject({ email: 'cliente@bigpecas.com', tipo_usuario: 'ambos' });
    });

    it('devolve o fallback quando ainda nao existe perfil', async () => {
      mockSupabaseAdmin.__mockTable('users', { data: null, error: null });

      const resposta = await request(app).get('/api/auth/profile');

      expect(resposta.body.full_name).toBe('Maria Silva');
    });

    it('responde 400 quando o token nao traz email', async () => {
      const resposta = await request(criarApp({ id: 'uuid-1' })).get('/api/auth/profile');

      expect(resposta.status).toBe(400);
      expect(resposta.body.error).toContain('identificar o email');
    });
  });

  describe('POST /profile', () => {
    const dados = { full_name: 'Maria Silva', nome_loja: 'Loja da Maria', telefone: '11999999999' };

    it('atualiza o perfil existente e responde 200', async () => {
      mockSupabaseAdmin.__queueTable(
        'users',
        { data: PERFIL, error: null },
        { data: PERFIL, error: null },
        { data: PERFIL, error: null },
      );
      mockSupabaseAdmin.auth.admin.updateUserById.mockResolvedValue({ data: { user: AUTH_USER }, error: null });

      const resposta = await request(app).post('/api/auth/profile').send(dados);

      expect(resposta.status).toBe(200);
      expect(resposta.body.message).toBe('Perfil atualizado com sucesso.');
    });

    it('cria o perfil e responde 201 quando ele ainda nao existe', async () => {
      mockSupabaseAdmin.__queueTable(
        'users',
        { data: null, error: null },
        { data: null, error: null },
        { data: PERFIL, error: null },
      );
      mockSupabaseAdmin.auth.admin.updateUserById.mockResolvedValue({ data: { user: AUTH_USER }, error: null });

      const resposta = await request(app).post('/api/auth/profile').send(dados);

      expect(resposta.status).toBe(201);
      expect(resposta.body.message).toBe('Perfil salvo com sucesso.');
    });

    it('replica os dados no metadata do Supabase Auth', async () => {
      mockSupabaseAdmin.__mockTable('users', { data: PERFIL, error: null });
      mockSupabaseAdmin.auth.admin.updateUserById.mockResolvedValue({ data: { user: AUTH_USER }, error: null });

      await request(app).post('/api/auth/profile').send(dados);

      expect(mockSupabaseAdmin.auth.admin.updateUserById).toHaveBeenCalledWith('uuid-1', {
        user_metadata: expect.objectContaining({
          full_name: 'Maria Silva',
          nome_loja: 'Loja da Maria',
          telefone: '11999999999',
        }),
      });
    });

    it('nao deixa o usuario trocar o email pelo corpo da requisicao', async () => {
      mockSupabaseAdmin.__queueTable(
        'users',
        { data: null, error: null },
        { data: null, error: null },
        { data: PERFIL, error: null },
      );
      mockSupabaseAdmin.auth.admin.updateUserById.mockResolvedValue({ data: { user: AUTH_USER }, error: null });

      await request(app).post('/api/auth/profile').send({ ...dados, email: 'outro@bigpecas.com' });

      const insercao = mockSupabaseAdmin.__callsFor('users')[2];
      expect(insercao.argumentos('insert')[0].email).toBe('cliente@bigpecas.com');
    });

    it('exige o nome completo', async () => {
      const resposta = await request(app).post('/api/auth/profile').send({ full_name: '   ' });

      expect(resposta.status).toBe(400);
      expect(resposta.body.error).toBe('Informe o nome completo.');
    });

    it('responde 400 quando o token nao traz um email valido', async () => {
      const resposta = await request(criarApp({ id: 'uuid-1', email: 'invalido' }))
        .post('/api/auth/profile')
        .send(dados);

      expect(resposta.status).toBe(400);
    });
  });

  describe('GET /users/:id', () => {
    it('busca por id numerico direto na tabela users', async () => {
      mockSupabaseAdmin.__mockTable('users', { data: PERFIL, error: null });

      const resposta = await request(app).get('/api/auth/users/42');

      expect(resposta.status).toBe(200);
      expect(resposta.body.user).toMatchObject({ id: 42, email: 'cliente@bigpecas.com' });
      expect(mockSupabaseAdmin.auth.admin.getUserById).not.toHaveBeenCalled();
    });

    it('busca por uuid no Supabase Auth e completa com o perfil', async () => {
      const uuid = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';
      mockSupabaseAdmin.auth.admin.getUserById.mockResolvedValue({ data: { user: AUTH_USER }, error: null });
      mockSupabaseAdmin.__mockTable('users', { data: PERFIL, error: null });

      const resposta = await request(app).get(`/api/auth/users/${uuid}`);

      expect(resposta.status).toBe(200);
      expect(mockSupabaseAdmin.auth.admin.getUserById).toHaveBeenCalledWith(uuid);
      expect(resposta.body.user.profile).toMatchObject({ email: 'cliente@bigpecas.com' });
    });

    it('responde 404 quando o id numerico nao existe', async () => {
      mockSupabaseAdmin.__mockTable('users', { data: null, error: null });

      const resposta = await request(app).get('/api/auth/users/999');

      expect(resposta.status).toBe(404);
      expect(resposta.body.error).toBe('Usuário não encontrado.');
    });

    it('responde 404 quando o uuid nao existe no Auth', async () => {
      mockSupabaseAdmin.auth.admin.getUserById.mockResolvedValue({ data: null, error: { message: 'not found' } });

      const resposta = await request(app).get('/api/auth/users/3f2504e0-4f89-11d3-9a0c-0305e82c3301');

      expect(resposta.status).toBe(404);
    });

    it.each(['abc', '42-x', 'nao-e-uuid-nem-numero'])(
      'recusa o id malformado "%s" com 400',
      async (id) => {
        const resposta = await request(app).get(`/api/auth/users/${id}`);

        expect(resposta.status).toBe(400);
        expect(resposta.body.error).toBe('Informe um id de usuário válido.');
      },
    );
  });
});
