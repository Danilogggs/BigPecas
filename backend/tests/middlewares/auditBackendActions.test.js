jest.mock('../../src/services/auditService', () => ({
  functionalityFromPath: jest.fn(() => 'pedidos'),
  record: jest.fn(() => Promise.resolve(true)),
}));
jest.mock('../../src/utils/logger', () => ({ warn: jest.fn() }));

const express = require('express');
const request = require('supertest');
const auditService = require('../../src/services/auditService');
const auditBackendActions = require('../../src/middlewares/auditBackendActions');

describe('auditBackendActions', () => {
  beforeEach(() => jest.clearAllMocks());

  function appFor(method = 'post') {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => { req.user = { id: 'auth-1', email: 'user@example.com' }; next(); });
    app.use(auditBackendActions);
    app[method]('/api/pedidos/:id', (req, res) => res.status(method === 'post' ? 201 : 200).json({
      ok: true, pedido: { id: req.params.id, itens: req.body.itens || [] },
    }));
    return app;
  }

  it('registra gravacao no banco depois da resposta', async () => {
    await request(appFor()).post('/api/pedidos/12').send({
      itens: [{ peca_id: 7, quantidade: 2 }], senha: 'nao-registrar', payment_token: 'segredo',
    }).expect(201);
    await new Promise((resolve) => setImmediate(resolve));
    expect(auditService.record).toHaveBeenCalledWith(expect.objectContaining({
      functionality_key: 'pedidos', event_type: 'database', http_method: 'POST',
      endpoint: '/api/pedidos/12', status_code: 201, success: true,
    }));
    const event = auditService.record.mock.calls[0][0];
    expect(event.metadata).toEqual(expect.objectContaining({
      resource_id: '12',
      request: expect.objectContaining({ body: expect.objectContaining({
        itens: [{ peca_id: 7, quantidade: 2 }], senha: '[REMOVIDO]', payment_token: '[REMOVIDO]',
      }) }),
      response: expect.objectContaining({ pedido: expect.objectContaining({ id: '12' }) }),
    }));
  });

  it('registra ativacao de backend por GET', async () => {
    await request(appFor('get')).get('/api/pedidos/12').expect(200);
    await new Promise((resolve) => setImmediate(resolve));
    expect(auditService.record).toHaveBeenCalledWith(expect.objectContaining({ event_type: 'backend' }));
  });

  it('ignora requisicao sem usuario autenticado', async () => {
    const app = express();
    app.use(auditBackendActions);
    app.get('/api/pedidos', (_req, res) => res.json({ ok: true }));
    await request(app).get('/api/pedidos').expect(200);
    expect(auditService.record).not.toHaveBeenCalled();
  });
});
