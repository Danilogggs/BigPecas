import auditGateway from '../auditGateway';
import { criarResposta, respostaDeErro } from '../../../../../jest/helpers/http';

const BASE = 'http://localhost:3001';
const jsonInvalido = () => ({ ok: false, json: async () => { throw new Error('x'); } });
beforeEach(() => { global.fetch = jest.fn(); });

test('registra navegacao e lista/salva funcionalidades e logs', async () => {
  fetch.mockResolvedValue(criarResposta({ body: { data: [] } }));
  await auditGateway.recordNavigation('tk', { a: 1 });
  expect(fetch.mock.calls[0][0]).toBe(`${BASE}/api/auditoria/eventos`);
  expect(fetch.mock.calls[0][1].headers).toEqual({ Authorization: 'Bearer tk', 'Content-Type': 'application/json' });
  await auditGateway.listFunctionalities('tk');
  expect(fetch.mock.calls[1][1].headers).toEqual({ Authorization: 'Bearer tk' });
  await auditGateway.saveFunctionalities('tk', [{ key: 'a' }]);
  expect(fetch.mock.calls[2][1].method).toBe('PUT');
  await auditGateway.listLogs('tk', 30);
  expect(fetch.mock.calls[3][0]).toBe(`${BASE}/api/admin/auditoria/logs?days=30`);
});

test('propaga erros com mensagem do servidor ou padrao', async () => {
  fetch.mockResolvedValueOnce(respostaDeErro(500, { error: 'boom' }));
  await expect(auditGateway.listLogs('tk', 7)).rejects.toThrow('boom');
  fetch.mockResolvedValueOnce(jsonInvalido());
  await expect(auditGateway.listLogs('tk', 7)).rejects.toThrow('Não foi possível concluir a ação de auditoria.');
});

test('exporta planilha com ou sem funcionalidade', async () => {
  const blob = { size: 1 };
  fetch.mockResolvedValue({ ok: true, blob: async () => blob });
  await expect(auditGateway.exportLogs('tk', 7)).resolves.toBe(blob);
  expect(fetch.mock.calls[0][0]).toBe(`${BASE}/api/admin/auditoria/exportar?days=7`);
  await auditGateway.exportLogs('tk', 30, 'home');
  expect(fetch.mock.calls[1][0]).toBe(`${BASE}/api/admin/auditoria/exportar?days=30&functionality=home`);
  fetch.mockResolvedValueOnce(respostaDeErro(500, { error: 'sem dados' }));
  await expect(auditGateway.exportLogs('tk', 7)).rejects.toThrow('sem dados');
  fetch.mockResolvedValueOnce(jsonInvalido());
  await expect(auditGateway.exportLogs('tk', 7)).rejects.toThrow('Não foi possível gerar a planilha.');
});
