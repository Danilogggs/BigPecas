const { EventEmitter } = require('node:events');
jest.mock('../../src/utils/logger', () => ({ log: jest.fn() }));
const logger = require('../../src/utils/logger');
const telemetry = require('../../src/middlewares/requestTelemetry');
test.each([200, 500])('registra resultado %s sem dados privados', statusCode => {
  const req = { method: 'GET', path: '/api/pecas/10', route: { path: '/:id' }, query: { token: 'secret' }, headers: { authorization: 'secret' } };
  const res = Object.assign(new EventEmitter(), { statusCode, setHeader: jest.fn() });
  const next = jest.fn();
  telemetry(req, res, next);
  res.emit('finish');
  expect(next).toHaveBeenCalled();
  expect(logger.log).toHaveBeenCalledWith(statusCode >= 500 ? 'error' : 'info', 'http_request', {
    requestId: expect.any(String), method: 'GET', route: '/:id', statusCode, durationMs: expect.any(Number),
  });
  expect(JSON.stringify(logger.log.mock.calls)).not.toContain('secret');
});
test('ignora healthchecks e anonimiza rotas desconhecidas', () => {
  for (const path of ['/api/health', '/unknown']) {
    const res = Object.assign(new EventEmitter(), { statusCode: 404, setHeader: jest.fn() });
    telemetry({ path, method: 'GET' }, res, jest.fn());
    res.emit('finish');
  }
  expect(logger.log).toHaveBeenCalledTimes(1);
  expect(logger.log.mock.calls[0][2].route).toBe('unmatched');
});
