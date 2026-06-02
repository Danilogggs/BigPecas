import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  listarPedidos,
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
    label: 'Aguardando Pagamento',
    color: '#B45309',
    bg: '#FEF3C7',
    border: '#FCD34D',
    icone: '⏳',
    descricao: 'Pedido criado. Conclua o pagamento para iniciar a separação.',
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
    icone: '✅',
    descricao: 'Pedido entregue ao destinatário.',
    ordem: 4,
  },
  [ORDER_STATUS.CANCELADO]: {
    label: 'Cancelado',
    color: '#7F1D1D',
    bg: '#FEE2E2',
    border: '#FCA5A5',
    icone: '✕',
    descricao: 'Pedido cancelado.',
    ordem: 0,
  },
};

export const OrderProvider = ({ children }) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState('');

  const carregarPedidos = useCallback(async () => {
    if (!user) {
      setOrders([]);
      return;
    }

    setLoadingOrders(true);
    setOrdersError('');

    try {
      const data = await listarPedidos();
      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      setOrdersError(error?.message || 'Não foi possível carregar seus pedidos.');
    } finally {
      setLoadingOrders(false);
    }
  }, [user]);

  useEffect(() => {
    carregarPedidos();
  }, [carregarPedidos]);

  const criarPedido = async ({ itens, frete, cupom, endereco, formaPagamento }) => {
    const pedido = await criarPedidoAPI({
      itens,
      frete,
      cupom,
      endereco,
      forma_pagamento: formaPagamento,
    });

    setOrders((prev) => [pedido, ...prev]);
    return pedido;
  };

  const atualizarStatusPedido = async (pedidoId, novoStatus) => {
    const pedidoAtualizado = await atualizarStatusPedidoAPI(pedidoId, novoStatus);

    setOrders((prev) =>
      prev.map((p) => (p.id === pedidoId ? pedidoAtualizado : p)),
    );

    return pedidoAtualizado;
  };

  const buscarPedido = (pedidoId) => orders.find((p) => p.id === pedidoId) || null;

  const recarregarPedido = async (pedidoId) => {
    try {
      const pedido = await buscarPedidoPorId(pedidoId);
      setOrders((prev) =>
        prev.map((p) => (p.id === pedidoId ? pedido : p)),
      );
      return pedido;
    } catch {
      return null;
    }
  };

  const value = {
    orders,
    loadingOrders,
    ordersError,
    criarPedido,
    atualizarStatusPedido,
    buscarPedido,
    recarregarPedido,
    carregarPedidos,
  };

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
};

export const useOrders = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrders deve ser usado dentro de OrderProvider');
  }
  return context;
};
