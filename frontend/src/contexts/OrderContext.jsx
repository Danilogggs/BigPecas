import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as pedidosGatewayPadrao from '../services/pedidosService';
import {
  normalizarPedido,
  ORDER_STATUS,
  STATUS_META,
} from '../features/pedidos/domain/pedido';
import { useAuth } from './AuthContext';

const OrderContext = createContext();
const ERRO_CARREGAR_HISTORICO = 'Não foi possível carregar o histórico de compras e vendas.';

export { ORDER_STATUS, STATUS_META };

export const OrderProvider = ({ children, pedidosGateway = pedidosGatewayPadrao }) => {
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
      const data = await pedidosGateway.listarHistoricoPedidos();
      setCompras((data?.compras || []).map((pedido) => normalizarPedido(pedido, 'compra')));
      setVendas((data?.vendas || []).map((pedido) => normalizarPedido(pedido, 'venda')));
      setPerfilHistorico(data?.perfil || null);
    } catch (error) {
      setCompras([]);
      setVendas([]);
      setOrdersError(error?.message || ERRO_CARREGAR_HISTORICO);
    } finally {
      setLoadingOrders(false);
      setHistoricoCarregado(true);
    }
  }, [pedidosGateway, user]);

  useEffect(() => {
    carregarPedidos();
  }, [carregarPedidos]);

  const criarPedido = async ({ itens, frete, cupom, endereco, formaPagamento }) => {
    const pedido = normalizarPedido(await pedidosGateway.criarPedidoAPI({
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
    const pedidoAtualizado = normalizarPedido(
      await pedidosGateway.atualizarStatusPedidoAPI(pedidoId, novoStatus),
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
    const pedidoAtualizado = normalizarPedido(
      await pedidosGateway.atualizarStatusPedidoAPI(pedidoId, ORDER_STATUS.ENTREGUE),
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
    const pedidoAtualizado = normalizarPedido(
      await pedidosGateway.atualizarStatusPedidoAPI(pedidoId, ORDER_STATUS.PAGO),
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
      const pedido = normalizarPedido(
        await pedidosGateway.buscarPedidoPorId(pedidoId, visao),
        visao,
      );
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
