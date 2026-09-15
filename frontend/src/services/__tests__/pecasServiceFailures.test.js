import { atualizarPeca, deletarPeca, buscarRecomendacoesPorPeca, buscarRecomendacoesPorHistorico, buscarFornecedoresRecomendados } from '../pecasService';
import { getSupabaseClient } from '../supabase';
import { criarResposta, respostaDeErro, sessaoValida } from '../../../jest/helpers/http';
jest.mock('../supabase', () => ({ getSupabaseClient: jest.fn() }));
beforeEach(() => {
  getSupabaseClient.mockReturnValue({ auth: { getSession: jest.fn().mockResolvedValue(sessaoValida()) } });
  global.fetch = jest.fn();
});
test.each([
  ['atualização', () => atualizarPeca(10, { preco: 100 })],
  ['exclusão', () => deletarPeca(10)],
  ['recomendações por peça', () => buscarRecomendacoesPorPeca(10)],
  ['recomendações por histórico', () => buscarRecomendacoesPorHistorico()],
  ['fornecedores', () => buscarFornecedoresRecomendados()],
])('trata falhas HTTP e de rede: %s', async (_name, request) => {
  fetch.mockResolvedValue(respostaDeErro(400, { error: 'Operação não permitida.' }));
  await expect(request()).rejects.toThrow('Operação não permitida.');
  fetch.mockRejectedValue(new TypeError('Failed to fetch'));
  await expect(request()).rejects.toThrow();
});
test('recomendações identificam uso do histórico e respeitam limite', async () => {
  const pecas = [{ id: 1 }];
  fetch.mockResolvedValue(criarResposta({ body: { recomendacoes: pecas, baseado_em_historico: true } }));
  await expect(buscarRecomendacoesPorHistorico(3)).resolves.toEqual({ recomendacoes: pecas, baseadoEmHistorico: true });
  expect(fetch).toHaveBeenCalledWith('http://localhost:3001/api/pecas/recomendacoes/historico?limite=3', expect.objectContaining({
    method: 'GET', headers: expect.objectContaining({ Authorization: 'Bearer token-de-teste' }),
  }));
});
test.each([{}, null])('histórico ausente retorna lista vazia (%s)', async body => {
  fetch.mockResolvedValue(criarResposta({ body }));
  await expect(buscarRecomendacoesPorHistorico()).resolves.toEqual({ recomendacoes: [], baseadoEmHistorico: false });
  expect(fetch.mock.calls[0][0]).toMatch(/limite=8$/);
});
