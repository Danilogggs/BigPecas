import { buscarContagemNotificacoesNaoLidas, listarNotificacoes, marcarNotificacaoComoLida } from '../notificacoesGateway';
import { getSupabaseClient } from '../../../../services/supabase';
import { criarResposta, respostaDeErro, sessaoValida } from '../../../../../jest/helpers/http';

jest.mock('../../../../services/supabase');
const sessao = (resultado) => getSupabaseClient.mockReturnValue({ auth: { getSession: jest.fn().mockResolvedValue(resultado) } });

beforeEach(() => { global.fetch = jest.fn(); sessao(sessaoValida()); });

test('conta, lista e marca notificacoes', async () => {
  fetch.mockResolvedValueOnce(criarResposta({ body: { count: '3' } }));
  await expect(buscarContagemNotificacoesNaoLidas()).resolves.toBe(3);
  fetch.mockResolvedValueOnce(criarResposta({ body: {} }));
  await expect(buscarContagemNotificacoesNaoLidas()).resolves.toBe(0);
  fetch.mockResolvedValueOnce(criarResposta({ body: { notificacoes: [{ id: 1 }] } }));
  await expect(listarNotificacoes()).resolves.toEqual([{ id: 1 }]);
  fetch.mockResolvedValueOnce(criarResposta({ body: {} }));
  await expect(listarNotificacoes()).resolves.toEqual([]);
  fetch.mockResolvedValueOnce(criarResposta({ body: { ok: true } }));
  await marcarNotificacaoComoLida(5);
  expect(fetch.mock.calls.at(-1)[0]).toBe('http://localhost:3001/api/notificacoes/5/lida');
  expect(fetch.mock.calls.at(-1)[1].method).toBe('PATCH');
});

test('exige sessao valida', async () => {
  sessao({ data: null, error: new Error('x') });
  await expect(listarNotificacoes()).rejects.toThrow('Você precisa entrar novamente para continuar.');
  sessao({ data: { session: null }, error: null });
  await expect(listarNotificacoes()).rejects.toThrow('Você precisa estar autenticado para continuar.');
});

test('converte respostas de erro em mensagens amigaveis', async () => {
  fetch.mockResolvedValueOnce(respostaDeErro(500, {}));
  await expect(listarNotificacoes()).rejects.toThrow();
  fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
  await expect(buscarContagemNotificacoesNaoLidas()).rejects.toThrow();
});
