import apiCartRepository from '../apiCartRepository';
import { getSupabaseClient } from '../../../../services/supabase';
import { criarResposta, respostaDeErro, sessaoValida } from '../../../../../jest/helpers/http';

jest.mock('../../../../services/supabase');
const sessao = (resultado) => getSupabaseClient.mockReturnValue({ auth: { getSession: jest.fn().mockResolvedValue(resultado) } });

beforeEach(() => { global.fetch = jest.fn(); sessao(sessaoValida()); });

test('carrega e salva somente id e quantidade', async () => {
  fetch.mockResolvedValueOnce(criarResposta({ body: { itens: [] } }));
  await expect(apiCartRepository.carregar()).resolves.toEqual({ itens: [] });
  expect(fetch.mock.calls[0][1].body).toBeUndefined();
  fetch.mockResolvedValueOnce(criarResposta({ body: { ok: true } }));
  await apiCartRepository.salvar([{ id: 1, quantidade: 2, nome: 'x' }]);
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ itens: [{ id: 1, quantidade: 2 }] });
});

test('falha sem sessao ou com erro http', async () => {
  sessao({ data: { session: null }, error: null });
  await expect(apiCartRepository.carregar()).rejects.toThrow('Você precisa estar autenticado para continuar.');
  sessao({ data: null, error: new Error('x') });
  await expect(apiCartRepository.carregar()).rejects.toThrow('Você precisa estar autenticado para continuar.');
  sessao(sessaoValida());
  fetch.mockResolvedValueOnce(respostaDeErro(500, {}));
  await expect(apiCartRepository.salvar([])).rejects.toThrow();
});
