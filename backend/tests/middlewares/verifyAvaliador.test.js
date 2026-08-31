const { createSupabaseMock } = require('../helpers/supabaseMock');

const mockSupabaseAdmin = createSupabaseMock();

jest.mock('../../src/config/supabaseClient', () => ({
  supabaseAdmin: mockSupabaseAdmin,
  supabasePublic: null,
}));

const { verifyAvaliador } = require('../../src/middlewares/verifyAvaliador');
const AppError = require('../../src/utils/AppError');

function executar(user) {
  const req = { user };
  const next = jest.fn();
  return { req, next, promise: verifyAvaliador(req, {}, next) };
}

/** Erro repassado ao `next` do Express. */
function erroDe(next) {
  return next.mock.calls[0][0];
}

describe('verifyAvaliador', () => {
  beforeEach(() => {
    mockSupabaseAdmin.__reset();
  });

  it('libera o acesso e expoe o perfil do avaliador', async () => {
    const perfil = { id: 9, tipo_usuario: 'avaliador', is_admin: false };
    mockSupabaseAdmin.__mockTable('users', { data: perfil, error: null });

    const { req, next, promise } = executar({ email: 'avaliador@bigpecas.com' });
    await promise;

    expect(req.avaliador).toEqual(perfil);
    expect(next).toHaveBeenCalledWith();
  });

  it('tambem libera administradores que nao sao avaliadores', async () => {
    mockSupabaseAdmin.__mockTable('users', {
      data: { id: 1, tipo_usuario: 'comprador', is_admin: true },
      error: null,
    });

    const { next, promise } = executar({ email: 'admin@bigpecas.com' });
    await promise;

    expect(next).toHaveBeenCalledWith();
  });

  it('normaliza o email antes de consultar a permissao', async () => {
    mockSupabaseAdmin.__mockTable('users', { data: { tipo_usuario: 'avaliador' }, error: null });

    await executar({ email: '  AVALIADOR@BigPecas.com  ' }).promise;

    expect(mockSupabaseAdmin.__callsFor('users')[0].argumentos('eq')).toEqual([
      'email',
      'avaliador@bigpecas.com',
    ]);
  });

  it.each([
    ['sem usuario no request', undefined],
    ['sem email no token', { id: 'sem-email' }],
    ['com email em branco', { email: '   ' }],
  ])('responde 401 %s', async (_descricao, user) => {
    const { next, promise } = executar(user);
    await promise;

    expect(erroDe(next)).toBeInstanceOf(AppError);
    expect(erroDe(next).statusCode).toBe(401);
    expect(mockSupabaseAdmin.__callsFor('users')).toHaveLength(0);
  });

  it.each([
    ['o usuario nao existe', null],
    ['o usuario nao e avaliador nem admin', { id: 3, tipo_usuario: 'comprador', is_admin: false }],
    ['is_admin nao e exatamente true', { id: 4, tipo_usuario: 'vendedor', is_admin: 'sim' }],
  ])('responde 403 quando %s', async (_descricao, data) => {
    mockSupabaseAdmin.__mockTable('users', { data, error: null });

    const { next, promise } = executar({ email: 'alguem@bigpecas.com' });
    await promise;

    expect(erroDe(next).statusCode).toBe(403);
    expect(erroDe(next).message).toBe('Acesso permitido somente a avaliadores e administradores.');
  });

  it('propaga o erro do Supabase para o handler de erros', async () => {
    const falha = new Error('conexao recusada');
    mockSupabaseAdmin.__mockTable('users', { data: null, error: falha });

    const { next, promise } = executar({ email: 'avaliador@bigpecas.com' });
    await promise;

    expect(erroDe(next)).toBe(falha);
  });
});
