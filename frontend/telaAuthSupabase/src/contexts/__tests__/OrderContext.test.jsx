import { renderHook, act, waitFor } from '@testing-library/react';
import { OrderProvider, useOrders, ORDER_STATUS, STATUS_META } from '../OrderContext';
import {
  listarHistoricoPedidos,
  buscarPedidoPorId,
  criarPedidoAPI,
  atualizarStatusPedidoAPI,
} from '../../services/pedidosService';
import { useAuth } from '../AuthContext';

jest.mock('../../services/pedidosService');
jest.mock('../AuthContext');

const USUARIO = { id: 'uuid-1', email: 'cliente@bigpecas.com' };

const COMPRA = {
  id: '2026-100200',
  status: 'pago',
  itens: [{ id: 10, quantidade: 2, preco: 350 }],
  historico: [{ status: 'pago', data: '2026-01-02T10:00:00.000Z' }],
  criado_em: '2026-01-01T10:00:00.000Z',
  codigo_rastreio: 'BG123456789AB',
  valor_frete: 30,
  total: 730,
};

const VENDA = { ...COMPRA, id: '2026-100300', valor_venda: 700 };

function historico({ compras = [COMPRA], vendas = [VENDA], perfil = { id: 5 } } = {}) {
  return { compras, vendas, perfil };
}

async function montarPedidos({ user = USUARIO } = {}) {
  useAuth.mockReturnValue({ user });

  const utils = renderHook(() => useOrders(), { wrapper: OrderProvider });
  await waitFor(() => expect(utils.result.current.historicoCarregado).toBe(true));

  return utils;
}

describe('OrderContext', () => {
  beforeEach(() => {
    listarHistoricoPedidos.mockResolvedValue(historico());
  });

  describe('constantes de status', () => {
    it('define os cinco status do fluxo do pedido', () => {
      expect(Object.values(ORDER_STATUS)).toEqual([
        'aguardando_pagamento', 'pago', 'enviado', 'entregue', 'cancelado',
      ]);
    });

    it('descreve cada status com rotulo e ordem', () => {
      Object.values(ORDER_STATUS).forEach((status) => {
        expect(STATUS_META[status]).toMatchObject({
          label: expect.any(String),
          descricao: expect.any(String),
          ordem: expect.any(Number),
        });
      });
    });
  });

  describe('carregamento do historico', () => {
    it('separa compras e vendas ao montar', async () => {
      const { result } = await montarPedidos();

      expect(result.current.compras.map((p) => p.id)).toEqual(['2026-100200']);
      expect(result.current.vendas.map((p) => p.id)).toEqual(['2026-100300']);
      expect(result.current.perfilHistorico).toEqual({ id: 5 });
      expect(result.current.ordersError).toBe('');
    });

    it('expoe `orders` como alias das compras', async () => {
      const { result } = await montarPedidos();

      expect(result.current.orders).toBe(result.current.compras);
    });

    it('nao busca nada quando nao ha usuario logado', async () => {
      useAuth.mockReturnValue({ user: null });
      const { result } = renderHook(() => useOrders(), { wrapper: OrderProvider });

      await waitFor(() => expect(result.current.loadingOrders).toBe(false));

      expect(listarHistoricoPedidos).not.toHaveBeenCalled();
      expect(result.current.compras).toEqual([]);
      expect(result.current.vendas).toEqual([]);
    });

    it('guarda a mensagem de erro e zera as listas quando a busca falha', async () => {
      listarHistoricoPedidos.mockRejectedValue(new Error('Não foi possível carregar o histórico.'));

      const { result } = await montarPedidos();

      expect(result.current.ordersError).toBe('Não foi possível carregar o histórico.');
      expect(result.current.compras).toEqual([]);
      expect(result.current.vendas).toEqual([]);
    });

    it('lida com uma resposta vazia do backend', async () => {
      listarHistoricoPedidos.mockResolvedValue({});

      const { result } = await montarPedidos();

      expect(result.current.compras).toEqual([]);
      expect(result.current.perfilHistorico).toBeNull();
    });

    it('permite recarregar o historico manualmente', async () => {
      const { result } = await montarPedidos();
      listarHistoricoPedidos.mockClear();

      await act(async () => { await result.current.carregarPedidos(); });

      expect(listarHistoricoPedidos).toHaveBeenCalledTimes(1);
    });
  });

  describe('normalizacao dos pedidos', () => {
    it('converte os campos snake_case do backend para camelCase', async () => {
      const { result } = await montarPedidos();

      expect(result.current.compras[0]).toMatchObject({
        criadoEm: '2026-01-01T10:00:00.000Z',
        codigoRastreio: 'BG123456789AB',
        valorFrete: 30,
        visao: 'compra',
      });
    });

    it('usa valor_venda como valor da transacao nas vendas', async () => {
      const { result } = await montarPedidos();

      expect(result.current.vendas[0].valorTransacao).toBe(700);
      expect(result.current.vendas[0].visao).toBe('venda');
    });

    it('prioriza valor_transacao quando o backend o envia', async () => {
      listarHistoricoPedidos.mockResolvedValue(historico({
        compras: [{ ...COMPRA, valor_transacao: 999 }],
        vendas: [],
      }));

      const { result } = await montarPedidos();

      expect(result.current.compras[0].valorTransacao).toBe(999);
    });

    it('garante listas para itens e historico ausentes', async () => {
      listarHistoricoPedidos.mockResolvedValue(historico({
        compras: [{ id: '2026-1', itens: null, historico: undefined }],
        vendas: [],
      }));

      const { result } = await montarPedidos();

      expect(result.current.compras[0].itens).toEqual([]);
      expect(result.current.compras[0].historico).toEqual([]);
    });

    it('preserva a visao ja definida pelo backend', async () => {
      listarHistoricoPedidos.mockResolvedValue(historico({
        compras: [{ ...COMPRA, visao: 'venda' }],
        vendas: [],
      }));

      const { result } = await montarPedidos();

      expect(result.current.compras[0].visao).toBe('venda');
    });
  });

  describe('criarPedido', () => {
    it('envia a forma de pagamento no formato do backend e insere no topo das compras', async () => {
      const novoPedido = { ...COMPRA, id: '2026-999999', status: 'aguardando_pagamento' };
      criarPedidoAPI.mockResolvedValue(novoPedido);

      const { result } = await montarPedidos();

      let retorno;
      await act(async () => {
        retorno = await result.current.criarPedido({
          itens: [{ id: 10, quantidade: 2 }],
          frete: { valor: 30 },
          cupom: null,
          endereco: { cep: '01310100' },
          formaPagamento: { nome: 'Pix' },
        });
      });

      expect(criarPedidoAPI).toHaveBeenCalledWith({
        itens: [{ id: 10, quantidade: 2 }],
        frete: { valor: 30 },
        cupom: null,
        endereco: { cep: '01310100' },
        forma_pagamento: { nome: 'Pix' },
      });
      expect(retorno.id).toBe('2026-999999');
      expect(result.current.compras.map((p) => p.id)).toEqual(['2026-999999', '2026-100200']);
    });

    it('propaga o erro da API sem alterar as compras', async () => {
      criarPedidoAPI.mockRejectedValue(new Error('Estoque insuficiente.'));

      const { result } = await montarPedidos();

      await expect(
        act(async () => {
          await result.current.criarPedido({ itens: [], formaPagamento: {} });
        }),
      ).rejects.toThrow('Estoque insuficiente.');

      expect(result.current.compras).toHaveLength(1);
    });
  });

  describe('atualizarStatusPedido', () => {
    it('substitui a venda e sincroniza o status da compra correspondente', async () => {
      listarHistoricoPedidos.mockResolvedValue(historico({
        compras: [{ ...COMPRA, id: '2026-100300' }],
        vendas: [{ ...VENDA, id: '2026-100300' }],
      }));
      atualizarStatusPedidoAPI.mockResolvedValue({
        ...VENDA,
        id: '2026-100300',
        status: 'enviado',
        historico: [{ status: 'enviado', data: '2026-01-03T10:00:00.000Z' }],
      });

      const { result } = await montarPedidos();

      await act(async () => {
        await result.current.atualizarStatusPedido('2026-100300', 'enviado');
      });

      expect(atualizarStatusPedidoAPI).toHaveBeenCalledWith('2026-100300', 'enviado');
      expect(result.current.vendas[0].status).toBe('enviado');
      expect(result.current.compras[0].status).toBe('enviado');
      expect(result.current.compras[0].historico).toHaveLength(1);
    });

    it('marca o pedido atualizado com a visao de venda', async () => {
      atualizarStatusPedidoAPI.mockResolvedValue({ ...VENDA, status: 'enviado' });

      const { result } = await montarPedidos();

      let retorno;
      await act(async () => {
        retorno = await result.current.atualizarStatusPedido('2026-100300', 'enviado');
      });

      expect(retorno.visao).toBe('venda');
    });
  });

  describe('confirmarRecebimentoPedido', () => {
    it('envia o status entregue e atualiza a compra', async () => {
      atualizarStatusPedidoAPI.mockResolvedValue({ ...COMPRA, status: 'entregue' });

      const { result } = await montarPedidos();

      await act(async () => {
        await result.current.confirmarRecebimentoPedido('2026-100200');
      });

      expect(atualizarStatusPedidoAPI).toHaveBeenCalledWith('2026-100200', 'entregue');
      expect(result.current.compras[0].status).toBe('entregue');
      expect(result.current.compras[0].visao).toBe('compra');
    });

    it('compara ids como texto, aceitando id numerico', async () => {
      listarHistoricoPedidos.mockResolvedValue(historico({
        compras: [{ ...COMPRA, id: 2026100200 }],
        vendas: [],
      }));
      atualizarStatusPedidoAPI.mockResolvedValue({ ...COMPRA, id: 2026100200, status: 'entregue' });

      const { result } = await montarPedidos();

      await act(async () => {
        await result.current.confirmarRecebimentoPedido('2026100200');
      });

      expect(result.current.compras[0].status).toBe('entregue');
    });
  });

  describe('confirmarPagamentoPedido', () => {
    it('envia o status pago', async () => {
      atualizarStatusPedidoAPI.mockResolvedValue({ ...COMPRA, status: 'pago' });

      const { result } = await montarPedidos();

      await act(async () => {
        await result.current.confirmarPagamentoPedido('2026-100200');
      });

      expect(atualizarStatusPedidoAPI).toHaveBeenCalledWith('2026-100200', 'pago');
    });
  });

  describe('buscarPedido', () => {
    it('encontra pedidos em compras e em vendas conforme a visao', async () => {
      const { result } = await montarPedidos();

      expect(result.current.buscarPedido('2026-100200').id).toBe('2026-100200');
      expect(result.current.buscarPedido('2026-100300', 'venda').id).toBe('2026-100300');
    });

    it('devolve null quando o pedido nao esta carregado', async () => {
      const { result } = await montarPedidos();

      expect(result.current.buscarPedido('inexistente')).toBeNull();
      expect(result.current.buscarPedido('2026-100200', 'venda')).toBeNull();
    });
  });

  describe('recarregarPedido', () => {
    it('substitui o pedido ja carregado', async () => {
      buscarPedidoPorId.mockResolvedValue({ ...COMPRA, status: 'entregue' });

      const { result } = await montarPedidos();

      await act(async () => { await result.current.recarregarPedido('2026-100200'); });

      expect(buscarPedidoPorId).toHaveBeenCalledWith('2026-100200', 'compra');
      expect(result.current.compras).toHaveLength(1);
      expect(result.current.compras[0].status).toBe('entregue');
    });

    it('insere no topo um pedido que ainda nao estava na lista', async () => {
      buscarPedidoPorId.mockResolvedValue({ ...COMPRA, id: '2026-777777' });

      const { result } = await montarPedidos();

      await act(async () => { await result.current.recarregarPedido('2026-777777'); });

      expect(result.current.compras.map((p) => p.id)).toEqual(['2026-777777', '2026-100200']);
    });

    it('atualiza a lista de vendas quando a visao e venda', async () => {
      buscarPedidoPorId.mockResolvedValue({ ...VENDA, status: 'entregue' });

      const { result } = await montarPedidos();

      await act(async () => { await result.current.recarregarPedido('2026-100300', 'venda'); });

      expect(result.current.vendas[0].status).toBe('entregue');
      expect(result.current.compras[0].status).toBe('pago');
    });

    it('devolve null sem quebrar quando a busca falha', async () => {
      buscarPedidoPorId.mockRejectedValue(new Error('Pedido não encontrado.'));

      const { result } = await montarPedidos();

      let retorno;
      await act(async () => { retorno = await result.current.recarregarPedido('nada'); });

      expect(retorno).toBeNull();
      expect(result.current.compras).toHaveLength(1);
    });
  });

  describe('useOrders', () => {
    it('exige o OrderProvider', () => {
      useAuth.mockReturnValue({ user: USUARIO });

      expect(() => renderHook(() => useOrders())).toThrow(
        'useOrders deve ser usado dentro de OrderProvider',
      );
    });
  });
});
