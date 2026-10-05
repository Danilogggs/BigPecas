const adaptarController = require('../../src/http/adaptarController');

describe('adaptarController', () => {
  test('executa um handler assincrono sem acoplar o caso de uso ao Express', async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    const next = jest.fn();
    const req = {};
    const res = {};

    await adaptarController(handler)(req, res, next);

    expect(handler).toHaveBeenCalledWith(req, res);
    expect(next).not.toHaveBeenCalled();
  });

  test('encaminha falhas assincronas ao middleware de erros', async () => {
    const error = new Error('falha esperada');
    const next = jest.fn();

    await adaptarController(async () => { throw error; })({}, {}, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  test('rejeita configuracao sem handler', () => {
    expect(() => adaptarController(null)).toThrow(TypeError);
  });
});
