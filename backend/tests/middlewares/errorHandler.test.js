const errorHandler = require('../../src/middlewares/errorHandler');
const logger = require('../../src/utils/logger');
const AppError = require('../../src/utils/AppError');

function criarResposta() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

const req = { method: 'POST', originalUrl: '/api/pecas/cadastrar' };

describe('errorHandler', () => {
  it('responde com o status e a mensagem amigavel do AppError', () => {
    const res = criarResposta();

    errorHandler(new AppError(400, 'Informe o nome da peça.'), req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Informe o nome da peça.' });
  });

  it('esconde detalhes tecnicos de erros inesperados', () => {
    const res = criarResposta();

    errorHandler(new Error('connect ECONNREFUSED 127.0.0.1:5432'), req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Ocorreu um erro interno. Tente novamente em instantes.',
    });
  });

  it('registra erros 5xx no nivel error, com stack e contexto da requisicao', () => {
    const erroLogger = jest.spyOn(logger, 'error').mockImplementation(() => {});
    const error = new Error('falha inesperada');

    errorHandler(error, req, criarResposta(), jest.fn());

    expect(erroLogger).toHaveBeenCalledWith('Erro interno', expect.objectContaining({
      method: 'POST',
      path: '/api/pecas/cadastrar',
      statusCode: 500,
      message: 'falha inesperada',
      stack: error.stack,
    }));
  });

  it('registra erros de cliente no nivel warn e sem stack', () => {
    const avisoLogger = jest.spyOn(logger, 'warn').mockImplementation(() => {});

    errorHandler(new AppError(404, 'Peça não encontrada.'), req, criarResposta(), jest.fn());

    expect(avisoLogger).toHaveBeenCalledWith('Erro de cliente', {
      method: 'POST',
      path: '/api/pecas/cadastrar',
      statusCode: 404,
      errorCode: null,
      message: 'Peça não encontrada.',
    });
  });

  it('inclui o codigo do erro do Postgres no log', () => {
    const avisoLogger = jest.spyOn(logger, 'warn').mockImplementation(() => {});

    errorHandler({ code: '23505', message: 'duplicate key' }, req, criarResposta(), jest.fn());

    expect(avisoLogger).toHaveBeenCalledWith(
      'Erro de cliente',
      expect.objectContaining({ errorCode: '23505', statusCode: 409 }),
    );
  });

  it('nao quebra quando o erro e nulo', () => {
    const res = criarResposta();

    expect(() => errorHandler(null, req, res, jest.fn())).not.toThrow();
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
