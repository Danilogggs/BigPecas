import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import { useOrders, ORDER_STATUS, STATUS_META } from '../contexts/OrderContext';
import './PedidosPage.css';

const formatBRL = (value) =>
  Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function formatDate(value) {
  if (!value) return 'Data não informada';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data não informada';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusMeta(status) {
  return STATUS_META[status] || {
    label: 'Status não informado',
    color: '#4B5563',
    bg: '#F3F4F6',
    border: '#D1D5DB',
    icone: '•',
    descricao: 'Não há informações adicionais sobre este status.',
    ordem: 99,
  };
}

function getItemName(item) {
  return item?.nome || item?.nome_peca || 'Peça';
}

function getOrderDate(order) {
  return order?.criadoEm || order?.criado_em;
}

function getOrderValue(order) {
  return Number(order?.valorTransacao ?? order?.valor_transacao ?? order?.valor_venda ?? order?.total ?? 0);
}

export default function PedidosPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    compras,
    vendas,
    perfilHistorico,
    loadingOrders,
    historicoCarregado,
    ordersError,
    buscarPedido,
    atualizarStatusPedido,
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

  const registrosFiltrados = useMemo(() => {
    if (filtroStatus === 'todos') return registros;
    return registros.filter((pedido) => pedido.status === filtroStatus);
  }, [filtroStatus, registros]);

  const resumo = useMemo(() => ({
    quantidade: registros.length,
    valor: registros.reduce((total, pedido) => total + getOrderValue(pedido), 0),
    concluidos: registros.filter((pedido) => pedido.status === ORDER_STATUS.ENTREGUE).length,
  }), [registros]);

  if (id && historicoCarregado && !loadingOrders && !pedidoSelecionado) {
    return (
      <PageShell>
        <EmptyState
          title="Registro não encontrado"
          description="Este pedido não existe ou não pertence ao histórico selecionado."
          actionLabel="Voltar ao histórico"
          onAction={() => navigate(visao === 'venda' ? '/pedidos?visao=vendas' : '/pedidos')}
        />
      </PageShell>
    );
  }

  if (pedidoSelecionado) {
    return (
      <OrderDetail
        order={pedidoSelecionado}
        view={visao}
        onBack={() => navigate(visao === 'venda' ? '/pedidos?visao=vendas' : '/pedidos')}
        onStatusChange={atualizarStatusPedido}
        onExplore={() => navigate('/buscaPecas')}
      />
    );
  }

  return (
    <PageShell>
      <div className="history-heading">
        <div>
          <div className="history-breadcrumb">
            <button type="button" onClick={() => navigate('/')}>Início</button>
            <span>›</span>
            <span>Histórico</span>
          </div>
          <h1>Histórico de compras e vendas</h1>
          <p>Consulte produtos, valores, datas e o andamento de cada negociação.</p>
        </div>
        <button type="button" className="history-refresh" onClick={carregarPedidos} disabled={loadingOrders}>
          {loadingOrders ? 'Atualizando...' : 'Atualizar histórico'}
        </button>
      </div>

      <div className="history-tabs" role="tablist" aria-label="Tipo de histórico">
        <TabButton
          active={visao === 'compra'}
          label="Minhas compras"
          count={compras.length}
          onClick={() => navigate('/pedidos')}
        />
        {podeVender && (
          <TabButton
            active={visao === 'venda'}
            label="Minhas vendas"
            count={vendas.length}
            onClick={() => navigate('/pedidos?visao=vendas')}
          />
        )}
      </div>

      <div className="history-summary">
        <SummaryCard label={visao === 'venda' ? 'Vendas realizadas' : 'Compras realizadas'} value={resumo.quantidade} />
        <SummaryCard label={visao === 'venda' ? 'Valor vendido' : 'Valor comprado'} value={formatBRL(resumo.valor)} />
        <SummaryCard label="Pedidos entregues" value={resumo.concluidos} />
      </div>

      <div className="history-section-heading">
        <div>
          <h2>{visao === 'venda' ? 'Vendas realizadas' : 'Compras anteriores'}</h2>
          <p>
            {visao === 'venda'
              ? 'Acompanhe as peças vendidas e atualize o andamento dos pedidos.'
              : 'Acompanhe suas compras anteriores e o status de entrega.'}
          </p>
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
          <button type="button" onClick={carregarPedidos}>Tentar novamente</button>
        </div>
      )}

      {historicoCarregado && !loadingOrders && !ordersError && registrosFiltrados.length === 0 && (
        <EmptyState
          title={filtroStatus !== 'todos'
            ? 'Nenhum registro com este status'
            : visao === 'venda'
              ? 'Nenhuma venda realizada ainda'
              : 'Você ainda não fez nenhuma compra'}
          description={filtroStatus !== 'todos'
            ? 'Selecione outro status para consultar o histórico.'
            : visao === 'venda'
              ? 'As vendas aparecerão aqui quando clientes comprarem suas peças.'
              : 'Explore o catálogo para realizar sua primeira compra.'}
          actionLabel={visao === 'compra' && filtroStatus === 'todos' ? 'Explorar peças' : ''}
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
    </PageShell>
  );
}

function PageShell({ children }) {
  return (
    <div className="history-page">
      <Header />
      <main className="history-container">{children}</main>
    </div>
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
  return (
    <div className="status-filters" aria-label="Filtrar por status">
      <FilterButton
        label="Todos"
        count={orders.length}
        active={selected === 'todos'}
        onClick={() => onChange('todos')}
      />
      {Object.entries(STATUS_META)
        .sort(([, first], [, second]) => first.ordem - second.ordem)
        .map(([status, meta]) => (
          <FilterButton
            key={status}
            label={meta.label}
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

function StatusBadge({ status }) {
  const meta = getStatusMeta(status);
  return (
    <span
      className="status-badge"
      style={{ color: meta.color, backgroundColor: meta.bg, borderColor: meta.border }}
    >
      <span>{meta.icone}</span> {meta.label}
    </span>
  );
}

function OrderCard({ order, view, onClick }) {
  const names = order.itens.map(getItemName);
  const counterpart = view === 'venda'
    ? `Cliente: ${order.comprador?.nome || 'Cliente BigPeças'}`
    : `Vendedor: ${[...new Set(order.itens.map((item) => item.fornecedor_nome).filter(Boolean))].join(', ') || 'BigPeças'}`;

  return (
    <button type="button" className="order-card" onClick={onClick}>
      <div className="order-card-main">
        <div className="order-card-topline">
          <StatusBadge status={order.status} />
          <span>{view === 'venda' ? 'Venda' : 'Pedido'} #{order.id}</span>
        </div>
        <h3>{names.slice(0, 2).join(', ')}{names.length > 2 ? ` e mais ${names.length - 2}` : ''}</h3>
        <div className="order-card-meta">
          <span>{order.itens.length} {order.itens.length === 1 ? 'produto' : 'produtos'}</span>
          <span>{counterpart}</span>
          <span>{formatDate(getOrderDate(order))}</span>
        </div>
      </div>
      <div className="order-card-value">
        <span>{view === 'venda' ? 'Valor da venda' : 'Valor do pedido'}</span>
        <strong>{formatBRL(getOrderValue(order))}</strong>
        <small>Ver detalhes →</small>
      </div>
    </button>
  );
}

function LoadingState() {
  return (
    <div className="history-loading" role="status">
      <span className="history-spinner" />
      <p>Carregando histórico...</p>
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

function OrderDetail({ order, view, onBack, onStatusChange, onExplore }) {
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const meta = getStatusMeta(order.status);
  const isSale = view === 'venda';
  const nextStatus = {
    [ORDER_STATUS.AGUARDANDO_PAGAMENTO]: ORDER_STATUS.PAGO,
    [ORDER_STATUS.PAGO]: ORDER_STATUS.ENVIADO,
    [ORDER_STATUS.ENVIADO]: ORDER_STATUS.ENTREGUE,
  }[order.status];
  const nextLabel = {
    [ORDER_STATUS.AGUARDANDO_PAGAMENTO]: 'Confirmar pagamento',
    [ORDER_STATUS.PAGO]: 'Marcar como enviado',
    [ORDER_STATUS.ENVIADO]: 'Marcar como entregue',
  }[order.status];

  async function updateStatus() {
    if (!nextStatus || updating) return;
    setUpdating(true);
    setUpdateError('');
    try {
      await onStatusChange(order.id, nextStatus);
    } catch (error) {
      setUpdateError(error?.message || 'Não foi possível atualizar o status deste pedido.');
    } finally {
      setUpdating(false);
    }
  }

  return (
    <PageShell>
      <button type="button" className="detail-back" onClick={onBack}>← Voltar ao histórico</button>

      <div className="detail-header">
        <div>
          <span>{isSale ? 'Venda realizada' : 'Compra realizada'}</span>
          <h1>{isSale ? 'Venda' : 'Pedido'} #{order.id}</h1>
          <p>{formatDate(getOrderDate(order))}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <section className="detail-status-card">
        <div>
          <strong>{meta.icone} {meta.label}</strong>
          <p>{meta.descricao}</p>
        </div>
        {isSale && order.pode_atualizar_status && nextStatus && (
          <button type="button" onClick={updateStatus} disabled={updating}>
            {updating ? 'Atualizando...' : nextLabel}
          </button>
        )}
      </section>
      {updateError && <div className="history-error" role="alert">{updateError}</div>}

      <div className="detail-grid">
        <div className="detail-column">
          <DetailCard title={isSale ? `Produtos vendidos (${order.itens.length})` : `Produtos comprados (${order.itens.length})`}>
            <div className="detail-items">
              {order.itens.map((item) => (
                <div className="detail-item" key={`${order.id}-${item.id}`}>
                  <div className="detail-item-image">
                    {item.imagem ? <img src={item.imagem} alt={getItemName(item)} /> : <span>⚙</span>}
                  </div>
                  <div>
                    <strong>{getItemName(item)}</strong>
                    <span>Quantidade: {item.quantidade} × {formatBRL(item.preco)}</span>
                    {!isSale && item.fornecedor_nome && <small>Vendido por {item.fornecedor_nome}</small>}
                  </div>
                  <b>{formatBRL(Number(item.preco || 0) * Number(item.quantidade || 1))}</b>
                </div>
              ))}
            </div>
          </DetailCard>

          <DetailCard title="Andamento">
            <div className="detail-timeline">
              {(order.historico.length ? order.historico : [{ status: order.status, data: getOrderDate(order) }]).map((event, index) => {
                const eventMeta = getStatusMeta(event.status);
                return (
                  <div key={`${event.status}-${event.data}-${index}`}>
                    <span style={{ backgroundColor: eventMeta.color }}>{eventMeta.icone}</span>
                    <div><strong>{eventMeta.label}</strong><small>{formatDate(event.data)}</small></div>
                  </div>
                );
              })}
            </div>
          </DetailCard>

          {order.endereco && (
            <DetailCard title="Entrega">
              {isSale && <p className="detail-counterpart"><strong>Cliente:</strong> {order.comprador?.nome || 'Cliente BigPeças'}</p>}
              <address>
                {order.endereco.nome && <strong>{order.endereco.nome}<br /></strong>}
                {order.endereco.logradouro}{order.endereco.numero ? `, ${order.endereco.numero}` : ''}
                {order.endereco.complemento ? ` - ${order.endereco.complemento}` : ''}<br />
                {order.endereco.bairro}{order.endereco.cidade ? ` - ${order.endereco.cidade}` : ''}
                {order.endereco.uf ? `/${order.endereco.uf}` : ''}<br />
                {order.endereco.cep && <>CEP {order.endereco.cep}</>}
              </address>
              {order.codigoRastreio && <p className="tracking-code">Rastreio: <strong>{order.codigoRastreio}</strong></p>}
            </DetailCard>
          )}
        </div>

        <aside className="detail-sidebar">
          <DetailCard title={isSale ? 'Resumo da venda' : 'Resumo da compra'}>
            {isSale ? (
              <>
                <ValueRow label="Produtos vendidos" value={formatBRL(getOrderValue(order))} />
                <div className="detail-total"><span>Total da venda</span><strong>{formatBRL(getOrderValue(order))}</strong></div>
                <p className="detail-note">O valor considera somente as suas peças neste pedido.</p>
              </>
            ) : (
              <>
                <ValueRow label="Subtotal" value={formatBRL(order.subtotal)} />
                {Number(order.desconto || 0) > 0 && <ValueRow label="Desconto" value={`- ${formatBRL(order.desconto)}`} />}
                <ValueRow label="Frete" value={Number(order.valorFrete) === 0 ? 'Grátis' : formatBRL(order.valorFrete)} />
                <div className="detail-total"><span>Total do pedido</span><strong>{formatBRL(order.total)}</strong></div>
                {order.forma_pagamento?.nome && <p className="detail-payment">Pagamento: <strong>{order.forma_pagamento.nome}</strong></p>}
              </>
            )}
          </DetailCard>

          {!isSale && (
            <button type="button" className="detail-primary-action" onClick={onExplore}>
              Comprar novamente
            </button>
          )}
          <button type="button" className="detail-secondary-action" onClick={onBack}>
            Voltar ao histórico
          </button>
        </aside>
      </div>
    </PageShell>
  );
}

function DetailCard({ title, children }) {
  return (
    <section className="detail-card">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function ValueRow({ label, value }) {
  return <div className="value-row"><span>{label}</span><strong>{value}</strong></div>;
}
