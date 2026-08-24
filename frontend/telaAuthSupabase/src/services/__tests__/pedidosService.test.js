import {
  listarPedidos,
  listarHistoricoPedidos,
  buscarPedidoPorId,
  criarPedidoAPI,
  atualizarStatusPedidoAPI,
} from '../pedidosService';
import { getSupabaseClient } from '../supabase';
import { criarResposta, respostaDeErro, sessaoValida } from '../../../jest/helpers/http';

jest.mock('../supabase');

const API = 'http://localhost:3001/api';
const PEDIDO = { id: '2026-100200', status: 'pago', total: 730 };

function mockarSessao(resultado = sessaoValida()) {
  getSupabaseClient.mockReturnValue({
    auth: { getSession: jest.fn().mockResolvedValue(resultado) },
  });
}

const url = () => global.fetch.mock.calls[0][0];
const opcoes = () => global.fetch.mock.calls[0][1];

describe('pedidosService', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    mockarSessao();
  });

  describe('listarPedidos', () => {
    it('devolve as compras do usuario', async () => {
      global.fetch.mockResolvedValue(criarResposta({ body: [PEDIDO] }));

      await expect(listarPedidos()).resolves.toEqual([PEDIDO]);
      expect(url()).toBe(`${API}/pedidos`);
    });

    it('avisa quando a listagem falha', async () => {
      global.fetch.mockResolvedValue(respostaDeErro(418, {}));

      await expect(listarPedidos()).rejects.toThrow('Não foi possível carregar seus pedidos.');
    });
  });

  describe('listarHistoricoPedidos', () => {
    it('devolve compras e vendas', async () => {
      const historico = { perfil: { id: 5 }, compras: [PEDIDO], vendas: [] };
      global.fetch.mockResolvedValue(criarResposta({ body: historico }));

      await expect(listarHistoricoPedidos()).resolves.toEqual(historico);
      expect(url()).toBe(`${API}/pedidos/historico`);
    });

    it('avisa quando o historico falha', async () => {
      global.fetch.mockResolvedValue(respostaDeErro(418, {}));

      await expect(listarHistoricoPedidos()).rejects.toThrow(
        'Não foi possível carregar o histórico de compras e vendas.',
      );
    });
  });

  describe('buscarPedidoPorId', () => {
    it('busca a visao de compra por padrao, sem query', async () => {
      global.fetch.mockResolvedValue(criarResposta({ body: PEDIDO }));

      await buscarPedidoPorId('2026-100200');

      expect(url()).toBe(`${API}/pedidos/2026-100200`);
    });

    it('pede a visao de venda quando solicitado', async () => {
      global.fetch.mockResolvedValue(criarResposta({ body: PEDIDO }));

      await buscarPedidoPorId('2026-100200', 'venda');

      expect(url()).toBe(`${API}/pedidos/2026-100200?visao=venda`);
    });

    it('trata visao desconhecida como compra', async () => {
      global.fetch.mockResolvedValue(criarResposta({ body: PEDIDO }));

      await buscarPedidoPorId('2026-100200', 'auditoria');

      expect(url()).toBe(`${API}/pedidos/2026-100200`);
    });

    it('avisa quando o pedido nao e encontrado', async () => {
      global.fetch.mockResolvedValue(respostaDeErro(404, { error: 'Pedido não encontrado.' }));

      await expect(buscarPedidoPorId('nada')).rejects.toThrow('Pedido não encontrado.');
    });
  });

  describe('criarPedidoAPI', () => {
    const dados = {
      itens: [{ id: 10, quantidade: 2 }],
      endereco: { cep: '01310100' },
      forma_pagamento: { nome: 'Pix' },
    };

    it('envia o pedido por POST', async () => {
      global.fetch.mockResolvedValue(criarResposta({ body: PEDIDO }));

      await expect(criarPedidoAPI(dados)).resolves.toEqual(PEDIDO);
      expect(opcoes().method).toBe('POST');
      expect(JSON.parse(opcoes().body)).toEqual(dados);
    });

    it('propaga o erro de estoque insuficiente', async () => {
      global.fetch.mockResolvedValue(
        respostaDeErro(409, { error: 'Estoque insuficiente para a peça Friso Opala.' }),
      );

      await expect(criarPedidoAPI(dados)).rejects.toThrow(
        'Estoque insuficiente para a peça Friso Opala.',
      );
    });

    it('converte a queda do backend em mensagem de conexao', async () => {
      global.fetch.mockRejectedValue(new TypeError('Failed to fetch'));

      await expect(criarPedidoAPI(dados)).rejects.toThrow(
        'Não foi possível se conectar ao servidor. Tente novamente em instantes.',
      );
    });
  });

  describe('atualizarStatusPedidoAPI', () => {
    it('envia o novo status por PATCH', async () => {
      global.fetch.mockResolvedValue(criarResposta({ body: { ...PEDIDO, status: 'enviado' } }));

      await atualizarStatusPedidoAPI('2026-100200', 'enviado');

      expect(url()).toBe(`${API}/pedidos/2026-100200/status`);
      expect(opcoes().method).toBe('PATCH');
      expect(JSON.parse(opcoes().body)).toEqual({ status: 'enviado' });
    });

    it('propaga a transicao de status recusada', async () => {
      global.fetch.mockResolvedValue(
        respostaDeErro(409, { error: 'Essa alteração de status não é permitida para o pedido atual.' }),
      );

      await expect(atualizarStatusPedidoAPI('2026-100200', 'entregue')).rejects.toThrow(
        'Essa alteração de status não é permitida para o pedido atual.',
      );
    });
  });

  describe('autenticacao', () => {
    it('envia o token em todas as chamadas', async () => {
      global.fetch.mockResolvedValue(criarResposta({ body: [] }));

      await listarPedidos();

      expect(opcoes().headers.Authorization).toBe('Bearer token-de-teste');
    });

    it('pede login quando nao ha sessao', async () => {
      mockarSessao({ data: { session: null }, error: null });

      await expect(listarPedidos()).rejects.toThrow('Você precisa estar autenticado para continuar.');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('pede novo login quando a sessao esta com erro', async () => {
      mockarSessao({ data: null, error: { message: 'session not found' } });

      await expect(listarPedidos()).rejects.toThrow('Você precisa entrar novamente para continuar.');
    });
  });
});
