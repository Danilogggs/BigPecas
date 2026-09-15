import service, { reviewRequest } from '../avaliadorService';
import { supabase } from '../supabase';
jest.mock('../supabase', () => ({ supabase: { auth: { getSession: jest.fn() } } }));
beforeEach(() => {
  supabase.auth.getSession.mockResolvedValue({ data: { session: { access_token: 'token-test' } } });
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
});
test.each([null, {}])('exige sessão autenticada %s', async session => {
  supabase.auth.getSession.mockResolvedValue({ data: { session } });
  await expect(reviewRequest('/test')).rejects.toThrow('Faça login novamente.');
  expect(fetch).not.toHaveBeenCalled();
});
test.each([
  ['getPecasPendentes', [], '/pecas-pendentes?limit=20&offset=0&order=recent'],
  ['getPecasPendentes', [5, 10, 'oldest'], '/pecas-pendentes?limit=5&offset=10&order=oldest'],
  ['getValidacaoPeca', [4], '/validacao/4'],
  ['getEstatisticas', [], '/estatisticas'],
  ['getChecklistCriterios', [], '/checklist-criterios'],
])('%s consulta endpoint autenticado', async (method, args, path) => {
  await expect(service[method](...args)).resolves.toEqual({ success: true });
  expect(fetch).toHaveBeenCalledWith('http://localhost:3001/api/avaliador' + path, {
    method: 'GET', headers: { Authorization: 'Bearer token-test', 'Content-Type': 'application/json' },
  });
});
test('envia aprovação e rejeição com revisão e checklist', async () => {
  await service.submitValidacao(4, [], 'ok', 2);
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ respostas: [], comentarios: 'ok', revisao: 2 });
  expect(fetch.mock.calls[0][1].method).toBe('POST');
  await service.rejectValidacao(4, 'incompleto', [], 2);
  expect(fetch.mock.calls[1][0]).toMatch(/\/validacao\/4\/rejeitar$/);
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ motivo: 'incompleto', respostas: [], revisao: 2 });
});
test.each([[{ error: 'erro' }, 'erro'], [{ message: 'mensagem' }, 'mensagem'], [{}, 'Não foi possível concluir a operação.']])('propaga falha HTTP', async (data, message) => {
  fetch.mockResolvedValue({ ok: false, json: async () => data });
  await expect(reviewRequest('/test')).rejects.toThrow(message);
});
test('propaga falha de rede', async () => {
  fetch.mockRejectedValue(new Error('offline'));
  await expect(reviewRequest('/test')).rejects.toThrow('offline');
});
