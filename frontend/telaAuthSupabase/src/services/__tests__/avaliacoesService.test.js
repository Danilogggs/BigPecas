import {
  buscarAvaliacoesPedido,
  avaliarFornecedor,
  avaliarProduto,
  buscarAvaliacoesFornecedor,
  buscarAvaliacoesProduto,
} from '../avaliacoesService';
import { getSupabaseClient } from '../supabase';
import { criarResposta, respostaDeErro, sessaoValida } from '../../../jest/helpers/http';

jest.mock('../supabase');

const API = 'http://localhost:3001/api';

function mockarSessao(resultado = sessaoValida()) {
  getSupabaseClient.mockReturnValue({
    auth: { getSession: jest.fn().mockResolvedValue(resultado) },
  });
}

const url = () => global.fetch.mock.calls[0][0];
const opcoes = () => global.fetch.mock.calls[0][1];

describe('avaliacoesService', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    mockarSessao();
  });

  describe('leituras', () => {
    it('busca o estado de avaliacao de uma compra', async () => {
      const estado = { pedido_id: '2026-1', liberada: true, fornecedores: [], produtos: [] };
      global.fetch.mockResolvedValue(criarResposta({ body: estado }));

      await expect(buscarAvaliacoesPedido('2026-1')).resolves.toEqual(estado);
      expect(url()).toBe(`${API}/avaliacoes/pedidos/2026-1`);
    });

    it('busca as avaliacoes de um vendedor', async () => {
      global.fetch.mockResolvedValue(criarResposta({ body: { resumo: { media: 4.5 }, avaliacoes: [] } }));

      await expect(buscarAvaliacoesFornecedor(5)).resolves.toMatchObject({ resumo: { media: 4.5 } });
      expect(url()).toBe(`${API}/avaliacoes/fornecedores/5`);
    });

    it('busca as avaliacoes de um produto', async () => {
      global.fetch.mockResolvedValue(criarResposta({ body: { resumo: { total: 3 }, avaliacoes: [] } }));

      await expect(buscarAvaliacoesProduto(10)).resolves.toMatchObject({ resumo: { total: 3 } });
      expect(url()).toBe(`${API}/avaliacoes/produtos/10`);
    });
  });

  describe('avaliarFornecedor', () => {
    const avaliacao = { pedido_id: '2026-1', fornecedor_id: 5, nota: 5, qualidade_peca: 5 };

    it('envia a avaliacao por POST', async () => {
      global.fetch.mockResolvedValue(criarResposta({ body: { id: 1 } }));

      await avaliarFornecedor(avaliacao);

      expect(url()).toBe(`${API}/avaliacoes/fornecedores`);
      expect(opcoes().method).toBe('POST');
      expect(JSON.parse(opcoes().body)).toEqual(avaliacao);
    });

    it('mantem o cabecalho de autenticacao junto das opcoes', async () => {
      global.fetch.mockResolvedValue(criarResposta({ body: { id: 1 } }));

      await avaliarFornecedor(avaliacao);

      expect(opcoes().headers).toEqual({
        'Content-Type': 'application/json',
        Authorization: 'Bearer token-de-teste',
      });
    });

    it('propaga a avaliacao duplicada', async () => {
      global.fetch.mockResolvedValue(
        respostaDeErro(409, { error: 'Este vendedor já foi avaliado nesta compra.' }),
      );

      await expect(avaliarFornecedor(avaliacao)).rejects.toThrow(
        'Este vendedor já foi avaliado nesta compra.',
      );
    });

    it('propaga o bloqueio de compra ainda nao entregue', async () => {
      global.fetch.mockResolvedValue(respostaDeErro(409, {
        error: 'A avaliação só é liberada após o comprador confirmar o recebimento do pedido.',
      }));

      await expect(avaliarFornecedor(avaliacao)).rejects.toThrow(/só é liberada após/);
    });
  });

  describe('avaliarProduto', () => {
    it('envia a avaliacao por POST', async () => {
      global.fetch.mockResolvedValue(criarResposta({ body: { id: 3 } }));

      await avaliarProduto({ pedido_id: '2026-1', venda_id: 'venda-1', nota: 4 });

      expect(url()).toBe(`${API}/avaliacoes/produtos`);
      expect(opcoes().method).toBe('POST');
    });

    it('usa a mensagem padrao quando o backend nao explica o erro', async () => {
      global.fetch.mockResolvedValue(respostaDeErro(418, {}));

      await expect(avaliarProduto({})).rejects.toThrow(
        'Não foi possível registrar a avaliação do produto.',
      );
    });
  });

  describe('autenticacao', () => {
    it.each([
      ['sem sessao', { data: { session: null }, error: null }],
      ['com erro de sessao', { data: null, error: { message: 'session not found' } }],
    ])('recusa a chamada %s', async (_descricao, sessao) => {
      mockarSessao(sessao);

      await expect(buscarAvaliacoesProduto(10)).rejects.toThrow(
        'Você precisa estar autenticado para continuar.',
      );
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
