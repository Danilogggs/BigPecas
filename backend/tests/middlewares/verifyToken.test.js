const { createSupabaseMock } = require('../helpers/supabaseMock');

const mockSupabaseAdmin = createSupabaseMock();

jest.mock('../../src/config/supabaseClient', () => ({
  supabaseAdmin: mockSupabaseAdmin,
  supabasePublic: null,
}));

const verifyToken = require('../../src/middlewares/verifyToken');
const AppError = require('../../src/utils/AppError');

function executar(headers = {}) {
  const req = { headers };
  const next = jest.fn();
  return { req, next, promise: verifyToken(req, {}, next) };
}

describe('verifyToken', () => {
  beforeEach(() => {
    mockSupabaseAdmin.__reset();
  });

  it('anexa o usuario e o token na requisicao quando o token e valido', async () => {
    const user = { id: 'uuid-1', email: 'vendedor@bigpecas.com' };
    mockSupabaseAdmin.auth.getUser.mockResolvedValue({ data: { user }, error: null });

    const { req, next, promise } = executar({ authorization: 'Bearer token-valido' });
    await promise;

    expect(mockSupabaseAdmin.auth.getUser).toHaveBeenCalledWith('token-valido');
    expect(req.user).toBe(user);
    expect(req.accessToken).toBe('token-valido');
    expect(next).toHaveBeenCalledWith();
  });

  it.each([
    ['sem header', {}],
    ['com esquema errado', { authorization: 'Basic abc123' }],
    ['com Bearer vazio', { authorization: 'Bearer ' }],
  ])('recusa requisicao %s com 401', async (_descricao, headers) => {
    const { next, promise } = executar(headers);
    await promise;

    const [erro] = next.mock.calls[0];
    expect(erro).toBeInstanceOf(AppError);
    expect(erro.statusCode).toBe(401);
    expect(erro.message).toContain('autenticado');
    expect(mockSupabaseAdmin.auth.getUser).not.toHaveBeenCalled();
  });

  it('recusa quando o Supabase reporta erro de validacao', async () => {
    mockSupabaseAdmin.auth.getUser.mockResolvedValue({
      data: null,
      error: { message: 'invalid JWT' },
    });

    const { req, next, promise } = executar({ authorization: 'Bearer token-expirado' });
    await promise;

    const [erro] = next.mock.calls[0];
    expect(erro.statusCode).toBe(401);
    expect(erro.message).toContain('Faça login novamente');
    expect(req.user).toBeUndefined();
  });

  it('recusa quando o Supabase responde sem usuario', async () => {
    mockSupabaseAdmin.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const { next, promise } = executar({ authorization: 'Bearer token-orfao' });
    await promise;

    expect(next.mock.calls[0][0].statusCode).toBe(401);
  });

  it('encaminha falhas inesperadas do Supabase para o errorHandler', async () => {
    const falha = new Error('rede indisponivel');
    mockSupabaseAdmin.auth.getUser.mockRejectedValue(falha);

    const { next, promise } = executar({ authorization: 'Bearer token' });
    await promise;

    expect(next).toHaveBeenCalledWith(falha);
  });
});
