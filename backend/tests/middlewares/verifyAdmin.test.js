const { createSupabaseMock } = require('../helpers/supabaseMock');

const mockSupabaseAdmin = createSupabaseMock();

jest.mock('../../src/config/supabaseClient', () => ({
  supabaseAdmin: mockSupabaseAdmin,
  supabasePublic: null,
}));

const verifyAdmin = require('../../src/middlewares/verifyAdmin');
const AppError = require('../../src/utils/AppError');

function executar(user) {
  const req = { user };
  const next = jest.fn();
  return { req, next, promise: verifyAdmin(req, {}, next) };
}

describe('verifyAdmin', () => {
  beforeEach(() => {
    mockSupabaseAdmin.__reset();
  });

  it('libera o acesso e expoe o perfil quando is_admin e true', async () => {
    const perfil = { id: 7, email: 'admin@bigpecas.com', full_name: 'Admin', is_admin: true };
    mockSupabaseAdmin.__mockTable('users', { data: perfil, error: null });

    const { req, next, promise } = executar({ email: 'Admin@BigPecas.com' });
    await promise;

    expect(req.admin).toEqual(perfil);
    expect(next).toHaveBeenCalledWith();
  });

  it('consulta a permissao no banco a cada requisicao, normalizando o email', async () => {
    mockSupabaseAdmin.__mockTable('users', { data: { is_admin: true }, error: null });

    await executar({ email: '  ADMIN@bigpecas.com  ' }).promise;

    const [consulta] = mockSupabaseAdmin.__callsFor('users');
    expect(consulta.argumentos('ilike')).toEqual(['email', 'admin@bigpecas.com']);
    expect(consulta.operacao('maybeSingle')).not.toBeNull();
  });

  it.each([
    ['is_admin false', { is_admin: false }],
    ['perfil inexistente', null],
  ])('bloqueia com 403 quando o usuario tem %s', async (_descricao, data) => {
    mockSupabaseAdmin.__mockTable('users', { data, error: null });

    const { req, next, promise } = executar({ email: 'cliente@bigpecas.com' });
    await promise;

    const [erro] = next.mock.calls[0];
    expect(erro).toBeInstanceOf(AppError);
    expect(erro.statusCode).toBe(403);
    expect(req.admin).toBeUndefined();
  });

  it.each([
    ['sem usuario autenticado', undefined],
    ['com email vazio', { email: '   ' }],
  ])('responde 401 quando a requisicao esta %s', async (_descricao, user) => {
    const { next, promise } = executar(user);
    await promise;

    expect(next.mock.calls[0][0].statusCode).toBe(401);
    expect(mockSupabaseAdmin.from).not.toHaveBeenCalled();
  });

  it('encaminha erros do Supabase para o errorHandler', async () => {
    const falha = { code: '42P01', message: 'relation "users" does not exist' };
    mockSupabaseAdmin.__mockTable('users', { data: null, error: falha });

    const { next, promise } = executar({ email: 'admin@bigpecas.com' });
    await promise;

    expect(next).toHaveBeenCalledWith(falha);
  });
});
