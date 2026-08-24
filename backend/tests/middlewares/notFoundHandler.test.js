const notFoundHandler = require('../../src/middlewares/notFoundHandler');

describe('notFoundHandler', () => {
  it('responde 404 com mensagem amigavel', () => {
    const res = { status: jest.fn(() => res), json: jest.fn(() => res) };

    notFoundHandler({ method: 'GET', originalUrl: '/rota-inexistente' }, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'O recurso solicitado não foi encontrado.',
    });
  });
});
