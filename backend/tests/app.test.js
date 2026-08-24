const request = require('supertest');
const { createSupabaseMock } = require('./helpers/supabaseMock');

const mockSupabaseAdmin = createSupabaseMock();
const mockSupabasePublic = createSupabaseMock();

const PERFIL = { id: 42, email: 'cliente@bigpecas.com', full_name: 'Maria' };

/**
 * Recarrega o app com limites baixos para que os testes de rate limit nao
 * precisem disparar centenas de requisicoes.
 */
function carregarApp(env = {}) {
  jest.resetModules();
  Object.assign(process.env, env);

  jest.doMock('../src/config/supabaseClient', () => ({
    supabaseAdmin: mockSupabaseAdmin,
    supabasePublic: mockSupabasePublic,
  }));

  require('../src/utils/logger').transports.forEach((transport) => {
    transport.silent = true;
  });

  return require('../src/app');
}

const CADASTRO = {
  full_name: 'Maria Silva',
  email: 'cliente@bigpecas.com',
  password: 'senha-super-secreta',
};

describe('app — integracao do rate limit com as rotas', () => {
  let envOriginal;

  beforeEach(() => {
    envOriginal = { ...process.env };
    mockSupabaseAdmin.__reset();
    mockSupabasePublic.__reset();
  });

  afterEach(() => {
    process.env = envOriginal;
    jest.resetModules();
  });

  describe('limite geral da API', () => {
    it('bloqueia com 429 e o formato padrao de erro ao estourar o limite', async () => {
      const app = carregarApp({ RATE_LIMIT_MAX: '1' });

      const primeira = await request(app).get('/');
      const segunda = await request(app).get('/');

      expect(primeira.status).toBe(200);
      expect(segunda.status).toBe(429);
      expect(segunda.body).toEqual({
        error: 'Muitas requisicoes. Aguarde um momento e tente novamente.',
      });
    });

    it('anuncia o limite nos cabecalhos RateLimit-*', async () => {
      const app = carregarApp({ RATE_LIMIT_MAX: '5' });

      const resposta = await request(app).get('/');

      expect(resposta.headers['ratelimit-limit']).toBe('5');
      expect(resposta.headers['ratelimit-remaining']).toBe('4');
    });

    it('nunca bloqueia o healthcheck, mesmo com o limite estourado', async () => {
      const app = carregarApp({ RATE_LIMIT_MAX: '1' });

      await request(app).get('/');
      await request(app).get('/');

      const health = await request(app).get('/api/health');

      expect(health.status).toBe(200);
      expect(health.body.status).toBe('ok');
    });

    it('o healthcheck nao consome a cota das demais rotas', async () => {
      const app = carregarApp({ RATE_LIMIT_MAX: '2' });

      await request(app).get('/api/health');
      await request(app).get('/api/health');
      await request(app).get('/api/health');

      expect((await request(app).get('/')).status).toBe(200);
    });
  });

  describe('limite restrito de criacao de conta', () => {
    it('bloqueia POST /api/auth/register acima do limite', async () => {
      const app = carregarApp({ RATE_LIMIT_REGISTRO_MAX: '1' });
      mockSupabaseAdmin.__mockTable('users', { data: PERFIL, error: null });

      const primeira = await request(app).post('/api/auth/register').send(CADASTRO);
      const segunda = await request(app).post('/api/auth/register').send(CADASTRO);

      // A primeira chega na rota (409: email ja cadastrado); a segunda nem passa.
      expect(primeira.status).toBe(409);
      expect(segunda.status).toBe(429);
      expect(segunda.body).toEqual({
        error: 'Muitas contas criadas a partir deste endereco. Aguarde alguns minutos e tente novamente.',
      });
    });

    it('o limite de registro nao afeta as outras rotas de /api/auth', async () => {
      const app = carregarApp({ RATE_LIMIT_REGISTRO_MAX: '1' });
      mockSupabaseAdmin.__mockTable('users', { data: PERFIL, error: null });

      await request(app).post('/api/auth/register').send(CADASTRO);
      await request(app).post('/api/auth/register').send(CADASTRO);

      const health = await request(app).get('/api/auth/health');

      expect(health.status).toBe(200);
    });

    it('e mais restrito que o limite geral de autenticacao', async () => {
      const app = carregarApp();

      const registro = await request(app).post('/api/auth/register').send({});
      const auth = await request(app).get('/api/auth/health');

      expect(Number(registro.headers['ratelimit-limit'])).toBe(5);
      expect(Number(auth.headers['ratelimit-limit'])).toBe(20);
    });

    it('nao consome tambem a cota de /api/auth, para nao contar em dobro', async () => {
      const app = carregarApp({ RATE_LIMIT_AUTH_MAX: '2' });
      mockSupabaseAdmin.__mockTable('users', { data: PERFIL, error: null });

      await request(app).post('/api/auth/register').send(CADASTRO);
      await request(app).post('/api/auth/register').send(CADASTRO);

      const health = await request(app).get('/api/auth/health');

      expect(health.status).toBe(200);
      expect(health.headers['ratelimit-remaining']).toBe('1');
    });
  });

  describe('limite das rotas de autenticacao', () => {
    it('bloqueia /api/auth acima do limite', async () => {
      const app = carregarApp({ RATE_LIMIT_AUTH_MAX: '1' });

      const primeira = await request(app).get('/api/auth/health');
      const segunda = await request(app).get('/api/auth/health');

      expect(primeira.status).toBe(200);
      expect(segunda.status).toBe(429);
      expect(segunda.body).toEqual({
        error: 'Muitas tentativas de autenticacao. Aguarde um momento e tente novamente.',
      });
    });
  });

  describe('limite do calculo de frete', () => {
    it('a rota exige autenticacao antes de consumir a cota de frete', async () => {
      const app = carregarApp({ RATE_LIMIT_FRETE_MAX: '1' });

      const resposta = await request(app).post('/api/frete/calcular').send({});

      expect(resposta.status).toBe(401);
    });

    it('anuncia o limite de frete para o cliente autenticado', async () => {
      const app = carregarApp({ RATE_LIMIT_FRETE_MAX: '3' });
      mockSupabaseAdmin.auth.getUser.mockResolvedValue({
        data: { user: { id: 'uuid-1', email: 'cliente@bigpecas.com' } },
        error: null,
      });

      const resposta = await request(app)
        .post('/api/frete/calcular')
        .set('Authorization', 'Bearer token-valido')
        .send({});

      expect(resposta.headers['ratelimit-limit']).toBe('3');
    });
  });

  describe('rotas sem rate limit proprio', () => {
    it('mantem o 404 padrao para rotas inexistentes', async () => {
      const app = carregarApp();

      const resposta = await request(app).get('/rota-que-nao-existe');

      expect(resposta.status).toBe(404);
      expect(resposta.body).toEqual({ error: 'O recurso solicitado não foi encontrado.' });
    });

    it('as rotas protegidas continuam exigindo token', async () => {
      const app = carregarApp();

      const resposta = await request(app).get('/api/pecas');

      expect(resposta.status).toBe(401);
    });
  });

  describe('deteccao do IP do cliente', () => {
    it('por padrao ignora X-Forwarded-For, evitando burlar o limite', async () => {
      const app = carregarApp({ RATE_LIMIT_MAX: '1' });

      await request(app).get('/').set('X-Forwarded-For', '203.0.113.1');
      const segunda = await request(app).get('/').set('X-Forwarded-For', '198.51.100.1');

      expect(segunda.status).toBe(429);
    });

    it('com TRUST_PROXY=1, separa os clientes pelo IP repassado pelo proxy', async () => {
      const app = carregarApp({ RATE_LIMIT_MAX: '1', TRUST_PROXY: '1' });

      const primeira = await request(app).get('/').set('X-Forwarded-For', '203.0.113.1');
      const outroCliente = await request(app).get('/').set('X-Forwarded-For', '198.51.100.1');
      const repetido = await request(app).get('/').set('X-Forwarded-For', '203.0.113.1');

      expect(primeira.status).toBe(200);
      expect(outroCliente.status).toBe(200);
      expect(repetido.status).toBe(429);
    });
  });
});
