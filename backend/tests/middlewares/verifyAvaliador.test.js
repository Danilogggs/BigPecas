const { createSupabaseMock } = require('../helpers/supabaseMock');
const mockDb = createSupabaseMock();
jest.mock('../../src/config/supabaseClient', () => ({ supabaseAdmin: mockDb }));
const { verifyAvaliador } = require('../../src/middlewares/verifyAvaliador');
beforeEach(() => mockDb.__reset());
it.each([{ id: 5, tipo_usuario: 'avaliador' }, { id: 6, tipo_usuario: 'ambos', is_admin: true }])('autoriza o perfil %j', async profile => {
  mockDb.__mockTable('users', { data: profile });
  const req = { user: { email: ' PESSOA@EXAMPLE.COM ' } }, next = jest.fn();
  await verifyAvaliador(req, {}, next);
  expect(req.avaliador).toEqual(profile);
  expect(next).toHaveBeenCalledWith();
  expect(mockDb.__callsFor('users')[0].argumentos('eq')).toEqual(['email', 'pessoa@example.com']);
});
it.each([null, { tipo_usuario: 'ambos' }, { tipo_usuario: 'ambos', is_admin: 'true' }])('recusa perfil %j', async data => {
  mockDb.__mockTable('users', { data });
  const next = jest.fn();
  await verifyAvaliador({ user: { email: 'pessoa@example.com' } }, {}, next);
  expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
});
it('exige autenticacao e propaga erro de banco', async () => {
  const next = jest.fn();
  await verifyAvaliador({}, {}, next);
  expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  const error = new Error('Indisponivel');
  mockDb.__mockTable('users', { error });
  await verifyAvaliador({ user: { email: 'pessoa@example.com' } }, {}, next);
  expect(next).toHaveBeenLastCalledWith(error);
});
