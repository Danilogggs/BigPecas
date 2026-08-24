const { resolveFriendlyError } = require('../../src/utils/errorMessages');
const AppError = require('../../src/utils/AppError');

describe('resolveFriendlyError', () => {
  it('mantem status e mensagem de um AppError', () => {
    expect(resolveFriendlyError(new AppError(403, 'Acesso negado.'))).toEqual({
      statusCode: 403,
      message: 'Acesso negado.',
    });
  });

  it('trata JSON malformado do body-parser como erro de formato', () => {
    const syntaxError = new SyntaxError('Unexpected token } in JSON at position 10');
    syntaxError.status = 400;
    syntaxError.body = '{"nome":}';

    expect(resolveFriendlyError(syntaxError)).toEqual({
      statusCode: 400,
      message: 'Os dados enviados estão em um formato inválido.',
    });
  });

  it('nao confunde um SyntaxError comum com JSON malformado', () => {
    const { statusCode } = resolveFriendlyError(new SyntaxError('erro de sintaxe qualquer'));

    expect(statusCode).toBe(500);
  });

  it.each([
    ['email_exists', 409],
    ['user_already_exists', 409],
    ['validation_failed', 400],
    ['weak_password', 400],
    ['invalid_credentials', 401],
    ['PGRST116', 404],
    ['23505', 409],
    ['23503', 400],
    ['42P01', 503],
    ['22P02', 400],
    ['42703', 503],
  ])('mapeia o codigo %s para o status %i', (code, statusCode) => {
    const resultado = resolveFriendlyError({ code });

    expect(resultado.statusCode).toBe(statusCode);
    expect(resultado.message).toEqual(expect.any(String));
  });

  describe('violacao de NOT NULL (23502)', () => {
    it('explica o caso especifico da coluna password_hash', () => {
      const resultado = resolveFriendlyError({
        code: '23502',
        message: 'null value in column "password_hash" violates not-null constraint',
      });

      expect(resultado.statusCode).toBe(503);
      expect(resultado.message).toContain('password_hash');
    });

    it('devolve mensagem generica para as demais colunas', () => {
      expect(
        resolveFriendlyError({ code: '23502', message: 'null value in column "email"' }),
      ).toEqual({
        statusCode: 400,
        message: 'Preencha os campos obrigatórios antes de continuar.',
      });
    });

    it('nao quebra quando o erro nao traz mensagem em texto', () => {
      expect(resolveFriendlyError({ code: '23502' }).statusCode).toBe(400);
    });
  });

  it.each([
    'User already registered',
    'Email has already been registered',
  ])('reconhece "%s" como email duplicado', (message) => {
    expect(resolveFriendlyError({ message })).toEqual({
      statusCode: 409,
      message: 'Este email já está cadastrado.',
    });
  });

  it.each(['invalid JWT', 'JWT expired', 'Invalid token'])(
    'trata "%s" como sessao invalida',
    (message) => {
      const resultado = resolveFriendlyError({ message });

      expect(resultado.statusCode).toBe(401);
      expect(resultado.message).toContain('Faça login novamente');
    },
  );

  it.each([
    'service_role key ausente',
    'Invalid API key',
    'SUPABASE_URL nao configurada',
  ])('trata "%s" como configuracao ausente do Supabase', (message) => {
    expect(resolveFriendlyError({ message }).statusCode).toBe(503);
  });

  it('preserva status 4xx desconhecidos com mensagem generica', () => {
    expect(resolveFriendlyError({ status: 422 })).toEqual({
      statusCode: 422,
      message: 'Não foi possível processar a solicitação. Revise os dados e tente novamente.',
    });
  });

  it('nao propaga status 5xx do erro original', () => {
    expect(resolveFriendlyError({ status: 502 }).statusCode).toBe(500);
  });

  it.each([[null], [undefined], [{}], ['erro em texto']])(
    'usa o fallback 500 para entradas sem informacao util (%p)',
    (entrada) => {
      expect(resolveFriendlyError(entrada)).toEqual({
        statusCode: 500,
        message: 'Ocorreu um erro interno. Tente novamente em instantes.',
      });
    },
  );

  it('prioriza o AppError sobre o mapeamento por codigo', () => {
    const error = new AppError(409, 'Este vendedor já foi avaliado nesta compra.');
    error.code = '23505';

    expect(resolveFriendlyError(error).message).toBe('Este vendedor já foi avaliado nesta compra.');
  });
});
