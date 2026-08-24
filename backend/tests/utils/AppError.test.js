const AppError = require('../../src/utils/AppError');

describe('AppError', () => {
  it('guarda o status http junto da mensagem', () => {
    const error = new AppError(404, 'Peça não encontrada.');

    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('Peça não encontrada.');
    expect(error.name).toBe('AppError');
  });

  it('continua sendo um Error capturavel por try/catch e instanceof', () => {
    const error = new AppError(400, 'Dados inválidos.');

    expect(error).toBeInstanceOf(Error);
    expect(error.stack).toContain('AppError');
  });
});
