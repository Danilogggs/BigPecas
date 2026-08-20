import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  listarHistoricoPedidos,
  buscarPedidoPorId,
  criarPedidoAPI,
  atualizarStatusPedidoAPI,
} from '../services/pedidosService';
import { useAuth } from './AuthContext';

const OrderContext = createContext();

export const ORDER_STATUS = {
  AGUARDANDO_PAGAMENTO: 'aguardando_pagamento',
  PAGO: 'pago',
  ENVIADO: 'enviado',
  ENTREGUE: 'entregue',
  CANCELADO: 'cancelado',
};

export const STATUS_META = {
  [ORDER_STATUS.AGUARDANDO_PAGAMENTO]: {
    label: 'Aguardando pagamento',
    color: '#92400E',
    bg: '#FEF3C7',
    border: '#FCD34D',
    icone: '⏳',
    descricao: 'Pedido criado e aguardando a confirmação do pagamento.',
    ordem: 1,
  },
  [ORDER_STATUS.PAGO]: {
    label: 'Pago',
    color: '#1D4ED8',
    bg: '#DBEAFE',
    border: '#93C5FD',
    icone: '💳',
    descricao: 'Pagamento confirmado. Pedido em preparação para envio.',
    ordem: 2,
  },
  [ORDER_STATUS.ENVIADO]: {
    label: 'Enviado',
    color: '#6D28D9',
    bg: '#EDE9FE',
    border: '#C4B5FD',
    icone: '🚚',
    descricao: 'Pedido despachado. Acompanhe pelo código de rastreio.',
    ordem: 3,
  },
  [ORDER_STATUS.ENTREGUE]: {
    label: 'Entregue',
    color: '#065F46',
    bg: '#D1FAE5',
    border: '#6EE7B7',
    icone: '📦',
    descricao: 'Pedido entregue ao destinatário.',
    ordem: 4,
  },
  [ORDER_STATUS.CANCELADO]: {
    label: 'Cancelado',
    color: '#991B1B',
    bg: '#FEE2E2',
    border: '#FCA5A5',
    icone: '×',
    descricao: 'Pedido cancelado.',
    ordem: 5,
  },
};

function normalizeOrder(order, visaoPadrao = 'compra') {
  if (!order) return null;
  return {
    ...order,
    visao: order.visao || visaoPadrao,
    itens: Array.isArray(order.itens) ? order.itens : [],
    historico: Array.isArray(order.historico) ? order.historico : [],
    criadoEm: order.criadoEm || order.criado_em,
    codigoRastreio: order.codigoRastreio || order.codigo_rastreio,
    valorFrete: Number(order.valorFrete ?? order.valor_frete ?? 0),
    valorTransacao: Number(order.valor_transacao ?? order.valor_venda ?? order.total ?? 0),
  };
}

export const OrderProvider = ({ children }) => {
  const { user } = useAuth();
  const [compras, setCompras] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [perfilHistorico, setPerfilHistorico] = useState(null);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [historicoCarregado, setHistoricoCarregado] = useState(false);
  const [ordersError, setOrdersError] = useState('');

  const carregarPedidos = useCallback(async () => {
    if (!user) {
      setCompras([]);
      setVendas([]);
      setPerfilHistorico(null);
      setHistoricoCarregado(false);
      return;
    }

    setLoadingOrders(true);
    setHistoricoCarregado(false);
    setOrdersError('');

    try {
      const data = await listarHistoricoPedidos();
      setCompras((data?.compras || []).map((pedido) => normalizeOrder(pedido, 'compra')));
      setVendas((data?.vendas || []).map((pedido) => normalizeOrder(pedido, 'venda')));
      setPerfilHistorico(data?.perfil || null);
    } catch (error) {
      setCompras([]);
      setVendas([]);
      setOrdersError(error?.message || 'Não foi possível carregar o histórico de compras e vendas.');
    } finally {
      setLoadingOrders(false);
      setHistoricoCarregado(true);
    }
  }, [user]);

  useEffect(() => {
    carregarPedidos();
  }, [carregarPedidos]);

  const criarPedido = async ({ itens, frete, cupom, endereco, formaPagamento }) => {
    const pedido = normalizeOrder(await criarPedidoAPI({
      itens,
      frete,
      cupom,
      endereco,
      forma_pagamento: formaPagamento,
    }));

    setCompras((prev) => [pedido, ...prev]);
    return pedido;
  };

  const atualizarStatusPedido = async (pedidoId, novoStatus) => {
    const pedidoAtualizado = normalizeOrder(
      await atualizarStatusPedidoAPI(pedidoId, novoStatus),
      'venda',
    );

    setVendas((prev) => prev.map((pedido) =>
      pedido.id === pedidoId ? pedidoAtualizado : pedido,
    ));
    setCompras((prev) => prev.map((pedido) =>
      pedido.id === pedidoId
        ? { ...pedido, status: pedidoAtualizado.status, historico: pedidoAtualizado.historico }
        : pedido,
    ));

    return pedidoAtualizado;
  };

  const confirmarRecebimentoPedido = async (pedidoId) => {
    const pedidoAtualizado = normalizeOrder(
      await atualizarStatusPedidoAPI(pedidoId, ORDER_STATUS.ENTREGUE),
      'compra',
    );

    setCompras((prev) => prev.map((pedido) =>
      String(pedido.id) === String(pedidoId) ? pedidoAtualizado : pedido,
    ));
    setVendas((prev) => prev.map((pedido) =>
      String(pedido.id) === String(pedidoId)
        ? { ...pedido, status: pedidoAtualizado.status, historico: pedidoAtualizado.historico }
        : pedido,
    ));

    return pedidoAtualizado;
  };

  const confirmarPagamentoPedido = async (pedidoId) => {
    const pedidoAtualizado = normalizeOrder(
      await atualizarStatusPedidoAPI(pedidoId, ORDER_STATUS.PAGO),
      'compra',
    );

    setCompras((prev) => prev.map((pedido) =>
      String(pedido.id) === String(pedidoId) ? pedidoAtualizado : pedido,
    ));
    setVendas((prev) => prev.map((pedido) =>
      String(pedido.id) === String(pedidoId)
        ? { ...pedido, status: pedidoAtualizado.status, historico: pedidoAtualizado.historico }
        : pedido,
    ));

    return pedidoAtualizado;
  };

  const buscarPedido = (pedidoId, visao = 'compra') => {
    const origem = visao === 'venda' ? vendas : compras;
    return origem.find((pedido) => String(pedido.id) === String(pedidoId)) || null;
  };

  const recarregarPedido = async (pedidoId, visao = 'compra') => {
    try {
      const pedido = normalizeOrder(await buscarPedidoPorId(pedidoId, visao), visao);
      const setter = visao === 'venda' ? setVendas : setCompras;
      setter((prev) => {
        const existe = prev.some((item) => String(item.id) === String(pedidoId));
        return existe
          ? prev.map((item) => (String(item.id) === String(pedidoId) ? pedido : item))
          : [pedido, ...prev];
      });
      return pedido;
    } catch {
      return null;
    }
  };

  const value = useMemo(() => ({
    orders: compras,
    compras,
    vendas,
    perfilHistorico,
    loadingOrders,
    historicoCarregado,
    ordersError,
    criarPedido,
    atualizarStatusPedido,
    confirmarRecebimentoPedido,
    confirmarPagamentoPedido,
    buscarPedido,
    recarregarPedido,
    carregarPedidos,
  }), [compras, vendas, perfilHistorico, loadingOrders, historicoCarregado, ordersError, carregarPedidos]);

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
};

export const useOrders = () => {
  const context = useContext(OrderContext);
  if (!context) throw new Error('useOrders deve ser usado dentro de OrderProvider');
  return context;
};
