import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useOrders } from '../contexts/OrderContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  filtrarPedidosPorStatus,
  obterDataPedido,
  obterNomeItem,
  obterValorPedido,
  resumirPedidos,
  STATUS_META,
} from '../features/pedidos/domain/pedido';
import PedidoDetalhe from '../features/pedidos/presentation/PedidoDetalhe';
import PedidosShell from '../features/pedidos/presentation/PedidosShell';
import StatusBadge from '../features/pedidos/presentation/StatusBadge';
import {
  formatarDataPedido,
  formatarMoeda,
  obterMetaStatus,
} from '../features/pedidos/presentation/pedidoPresentation';
import './PedidosPage.css';

export default function PedidosPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const {
    compras,
    vendas,
    perfilHistorico,
    loadingOrders,
    historicoCarregado,
    ordersError,
    buscarPedido,
    atualizarStatusPedido,
    confirmarRecebimentoPedido,
    carregarPedidos,
  } = useOrders();
  const [filtroStatus, setFiltroStatus] = useState('todos');

  const visao = searchParams.get('visao') === 'vendas' ? 'venda' : 'compra';
  const podeVender = Boolean(perfilHistorico?.pode_vender || vendas.length > 0);
  const registros = visao === 'venda' ? vendas : compras;
  const pedidoSelecionado = id ? buscarPedido(id, visao) : null;

  useEffect(() => {
    setFiltroStatus('todos');
  }, [visao]);

  useEffect(() => {
    if (historicoCarregado && !loadingOrders && visao === 'venda' && !podeVender) {
      navigate(id ? `/pedidos/${id}` : '/pedidos', { replace: true });
    }
  }, [historicoCarregado, id, loadingOrders, navigate, podeVender, visao]);

  const registrosFiltrados = useMemo(
    () => filtrarPedidosPorStatus(registros, filtroStatus),
    [filtroStatus, registros],
  );
  const resumo = useMemo(() => resumirPedidos(registros), [registros]);

  if (id && historicoCarregado && !loadingOrders && !pedidoSelecionado) {
    return (
      <PedidosShell>
        <EmptyState
          title={t('orderNotFound')}
          description={t('orderNotFoundDescription')}
          actionLabel={t('backToHistory')}
          onAction={() => navigate(visao === 'venda' ? '/pedidos?visao=vendas' : '/pedidos')}
        />
      </PedidosShell>
    );
  }

  if (pedidoSelecionado) {
    return (
      <PedidoDetalhe
        order={pedidoSelecionado}
        view={visao}
        onBack={() => navigate(visao === 'venda' ? '/pedidos?visao=vendas' : '/pedidos')}
        onStatusChange={atualizarStatusPedido}
        onConfirmReceipt={confirmarRecebimentoPedido}
        onExplore={() => navigate('/buscaPecas')}
      />
    );
  }

  return (
    <PedidosShell>
      <div className="history-heading">
        <div>
          <div className="history-breadcrumb">
            <button type="button" onClick={() => navigate('/')}>{t('home')}</button>
            <span>›</span>
            <span>{t('history')}</span>
          </div>
          <h1>{t('ordersHistory')}</h1>
          <p>{t('ordersHistoryDescription')}</p>
        </div>
        <button type="button" className="history-refresh" onClick={carregarPedidos} disabled={loadingOrders}>
          {loadingOrders ? t('updating') : t('refreshHistory')}
        </button>
      </div>

      <div className="history-tabs" role="tablist" aria-label={t('historyType')}>
        <TabButton
          active={visao === 'compra'}
          label={t('myPurchases')}
          count={compras.length}
          onClick={() => navigate('/pedidos')}
        />
        {podeVender && (
          <TabButton
            active={visao === 'venda'}
            label={t('mySales')}
            count={vendas.length}
            onClick={() => navigate('/pedidos?visao=vendas')}
          />
        )}
      </div>

      <div className="history-summary">
        <SummaryCard label={visao === 'venda' ? t('completedSales') : t('completedPurchases')} value={resumo.quantidade} />
        <SummaryCard label={visao === 'venda' ? t('soldValue') : t('purchasedValue')} value={formatarMoeda(resumo.valor)} />
        <SummaryCard label={t('deliveredOrders')} value={resumo.concluidos} />
      </div>

      <div className="history-section-heading">
        <div>
          <h2>{visao === 'venda' ? t('completedSales') : t('previousPurchases')}</h2>
          <p>{visao === 'venda' ? t('salesDescription') : t('purchasesDescription')}</p>
        </div>
      </div>

      <StatusFilters
        orders={registros}
        selected={filtroStatus}
        onChange={setFiltroStatus}
      />

      {(!historicoCarregado || loadingOrders) && <LoadingState />}

      {ordersError && historicoCarregado && !loadingOrders && (
        <div className="history-error" role="alert">
          <span>{ordersError}</span>
          <button type="button" onClick={carregarPedidos}>{t('tryAgain')}</button>
        </div>
      )}

      {historicoCarregado && !loadingOrders && !ordersError && registrosFiltrados.length === 0 && (
        <EmptyState
          title={filtroStatus !== 'todos'
            ? t('noOrderStatus')
            : visao === 'venda'
              ? t('noSales')
              : t('noPurchases')}
          description={filtroStatus !== 'todos'
            ? t('selectAnotherStatus')
            : visao === 'venda'
              ? t('salesWillAppear')
              : t('firstPurchase')}
          actionLabel={visao === 'compra' && filtroStatus === 'todos' ? t('exploreParts') : ''}
          onAction={() => navigate('/buscaPecas')}
        />
      )}

      {historicoCarregado && !loadingOrders && !ordersError && registrosFiltrados.length > 0 && (
        <div className="history-list">
          {registrosFiltrados.map((pedido) => (
            <OrderCard
              key={pedido.id}
              order={pedido}
              view={visao}
              onClick={() => navigate(
                visao === 'venda'
                  ? `/pedidos/${pedido.id}?visao=vendas`
                  : `/pedidos/${pedido.id}`,
              )}
            />
          ))}
        </div>
      )}
    </PedidosShell>
  );
}

function TabButton({ active, label, count, onClick }) {
  return (
    <button type="button" role="tab" aria-selected={active} className={active ? 'active' : ''} onClick={onClick}>
      <span>{label}</span>
      <strong>{count}</strong>
    </button>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="summary-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatusFilters({ orders, selected, onChange }) {
  const { t } = useLanguage();
  return (
    <div className="status-filters" aria-label={t('filterByStatus')}>
      <FilterButton
        label={t('all')}
        count={orders.length}
        active={selected === 'todos'}
        onClick={() => onChange('todos')}
      />
      {Object.entries(STATUS_META)
        .sort(([, first], [, second]) => first.ordem - second.ordem)
        .map(([status]) => (
          <FilterButton
            key={status}
            label={obterMetaStatus(status, t).label}
            count={orders.filter((order) => order.status === status).length}
            active={selected === status}
            onClick={() => onChange(status)}
          />
        ))}
    </div>
  );
}

function FilterButton({ label, count, active, onClick }) {
  return (
    <button type="button" className={active ? 'active' : ''} onClick={onClick}>
      {label} <span>{count}</span>
    </button>
  );
}

function OrderCard({ order, view, onClick }) {
  const { t, formatDate } = useLanguage();
  const names = order.itens.map(obterNomeItem);
  const counterpart = view === 'venda'
    ? `${t('client')}: ${order.comprador?.nome || t('bigPecasCustomer')}`
    : `${t('seller')}: ${[...new Set(order.itens.map((item) => item.fornecedor_nome).filter(Boolean))].join(', ') || 'BigPeças'}`;

  return (
    <button type="button" className="order-card" onClick={onClick}>
      <div className="order-card-main">
        <div className="order-card-topline">
          <StatusBadge status={order.status} />
          <span>{view === 'venda' ? t('sale') : t('order')} #{order.id}</span>
        </div>
        <h3>{names.slice(0, 2).join(', ')}{names.length > 2 ? ` e mais ${names.length - 2}` : ''}</h3>
        <div className="order-card-meta">
          <span>{order.itens.length} {order.itens.length === 1 ? t('product') : t('products')}</span>
          <span>{counterpart}</span>
          <span>{formatarDataPedido(obterDataPedido(order), formatDate)}</span>
        </div>
      </div>
      <div className="order-card-value">
        <span>{view === 'venda' ? t('saleValue') : t('orderValue')}</span>
        <strong>{formatarMoeda(obterValorPedido(order))}</strong>
        <small>{t('viewDetailsArrow')}</small>
      </div>
    </button>
  );
}

function LoadingState() {
  const { t } = useLanguage();
  return (
    <div className="history-loading" role="status">
      <span className="history-spinner" />
      <p>{t('loadingHistory')}</p>
    </div>
  );
}

function EmptyState({ title, description, actionLabel, onAction }) {
  return (
    <div className="history-empty">
      <div className="history-empty-icon">↺</div>
      <h2>{title}</h2>
      <p>{description}</p>
      {actionLabel && <button type="button" onClick={onAction}>{actionLabel}</button>}
    </div>
  );
}
