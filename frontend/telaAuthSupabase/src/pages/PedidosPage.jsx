import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import { useOrders, ORDER_STATUS, STATUS_META } from '../contexts/OrderContext';
import {
  avaliarFornecedor,
  avaliarProduto,
  buscarAvaliacoesPedido,
} from '../services/avaliacoesService';
import './PedidosPage.css';
import { useLanguage } from '../contexts/LanguageContext';

const formatBRL = (value) =>
  Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function formatOrderDate(value, formatDate) {
  if (!value) return '';
  return formatDate(value, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusMeta(status, t) {
  const labels = {
    [ORDER_STATUS.AGUARDANDO_PAGAMENTO]: 'awaitingPayment',
    [ORDER_STATUS.PAGO]: 'paid',
    [ORDER_STATUS.ENVIADO]: 'shipped',
    [ORDER_STATUS.ENTREGUE]: 'delivered',
    [ORDER_STATUS.CANCELADO]: 'canceled',
  };
  const statusMeta = STATUS_META[status];
  if (statusMeta) return { ...statusMeta, label: t(labels[status]) };
  return STATUS_META[status] || {
    label: t('unknownStatus'),
    color: '#4B5563',
    bg: '#F3F4F6',
    border: '#D1D5DB',
    icone: '•',
    descricao: t('unknownStatusDescription'),
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
  const { formatDate, t } = useLanguage();
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
          title={t('orderNotFound')}
          description={t('orderNotFoundDescription')}
          actionLabel={t('backToHistory')}
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
        onConfirmReceipt={confirmarRecebimentoPedido}
        onExplore={() => navigate('/buscaPecas')}
      />
    );
  }

  return (
    <PageShell>
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
        <SummaryCard label={visao === 'venda' ? t('soldValue') : t('purchasedValue')} value={formatBRL(resumo.valor)} />
        <SummaryCard label={t('deliveredOrders')} value={resumo.concluidos} />
      </div>

      <div className="history-section-heading">
        <div>
          <h2>{visao === 'venda' ? t('completedSales') : t('previousPurchases')}</h2>
          <p>
            {visao === 'venda'
              ? t('salesDescription')
              : t('purchasesDescription')}
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
        .map(([status, meta]) => (
          <FilterButton
            key={status}
            label={getStatusMeta(status, t).label}
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
  const { t } = useLanguage();
  const meta = getStatusMeta(status, t);
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
  const { t, formatDate } = useLanguage();
  const names = order.itens.map(getItemName);
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
          <span>{formatOrderDate(getOrderDate(order), formatDate)}</span>
        </div>
      </div>
      <div className="order-card-value">
        <span>{view === 'venda' ? t('saleValue') : t('orderValue')}</span>
        <strong>{formatBRL(getOrderValue(order))}</strong>
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

function OrderDetail({ order, view, onBack, onStatusChange, onConfirmReceipt, onExplore }) {
  const { t, formatDate } = useLanguage();
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const meta = getStatusMeta(order.status, t);
  const isSale = view === 'venda';
  const nextStatus = {
    [ORDER_STATUS.AGUARDANDO_PAGAMENTO]: ORDER_STATUS.PAGO,
    [ORDER_STATUS.PAGO]: ORDER_STATUS.ENVIADO,
  }[order.status];
  const nextLabel = {
    [ORDER_STATUS.AGUARDANDO_PAGAMENTO]: 'confirmPayment',
    [ORDER_STATUS.PAGO]: 'markAsShipped',
  }[order.status];
  const podeConfirmarRecebimento = !isSale && order.status === ORDER_STATUS.ENVIADO;

  async function updateStatus() {
    if (!nextStatus || updating) return;
    setUpdating(true);
    setUpdateError('');
    try {
      await onStatusChange(order.id, nextStatus);
    } catch (error) {
      setUpdateError(error?.message || t('updateOrderStatusFailed'));
    } finally {
      setUpdating(false);
    }
  }

  async function confirmReceipt() {
    if (!podeConfirmarRecebimento || updating) return;
    setUpdating(true);
    setUpdateError('');
    try {
      await onConfirmReceipt(order.id);
    } catch (error) {
      setUpdateError(error?.message || t('confirmReceiptFailed'));
    } finally {
      setUpdating(false);
    }
  }

  return (
    <PageShell>
      <button type="button" className="detail-back" onClick={onBack}>← {t('backToHistory')}</button>

      <div className="detail-header">
        <div>
          <span>{isSale ? t('completedSale') : t('completedPurchase')}</span>
          <h1>{isSale ? t('sale') : t('order')} #{order.id}</h1>
          <p>{formatOrderDate(getOrderDate(order), formatDate)}</p>
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
            {updating ? t('updating') : t(nextLabel)}
          </button>
        )}
        {podeConfirmarRecebimento && (
          <button type="button" onClick={confirmReceipt} disabled={updating}>
            {updating ? t('confirming') : t('confirmReceipt')}
          </button>
        )}
      </section>
      {updateError && <div className="history-error" role="alert">{updateError}</div>}

      <div className="detail-grid">
        <div className="detail-column">
          <DetailCard title={isSale ? `${t('soldProducts')} (${order.itens.length})` : `${t('boughtProducts')} (${order.itens.length})`}>
            <div className="detail-items">
              {order.itens.map((item) => (
                <div className="detail-item" key={`${order.id}-${item.id}`}>
                  <div className="detail-item-image">
                    {item.imagem ? <img src={item.imagem} alt={getItemName(item)} /> : <span>⚙</span>}
                  </div>
                  <div>
                    <strong>{getItemName(item)}</strong>
                    <span>{t('quantity')}: {item.quantidade} × {formatBRL(item.preco)}</span>
                    {!isSale && item.fornecedor_nome && <small>{t('soldBy')} {item.fornecedor_nome}</small>}
                  </div>
                  <b>{formatBRL(Number(item.preco || 0) * Number(item.quantidade || 1))}</b>
                </div>
              ))}
            </div>
          </DetailCard>

          <DetailCard title={t('progress')}>
            <div className="detail-timeline">
              {(order.historico.length ? order.historico : [{ status: order.status, data: getOrderDate(order) }]).map((event, index) => {
                const eventMeta = getStatusMeta(event.status, t);
                return (
                  <div key={`${event.status}-${event.data}-${index}`}>
                    <span style={{ backgroundColor: eventMeta.color }}>{eventMeta.icone}</span>
                    <div><strong>{eventMeta.label}</strong><small>{formatOrderDate(event.data, formatDate)}</small></div>
                  </div>
                );
              })}
            </div>
          </DetailCard>

          {order.endereco && (
            <DetailCard title={t('delivery')}>
              {isSale && <p className="detail-counterpart"><strong>{t('customer')}:</strong> {order.comprador?.nome || t('bigPecasCustomer')}</p>}
              <address>
                {order.endereco.nome && <strong>{order.endereco.nome}<br /></strong>}
                {order.endereco.logradouro}{order.endereco.numero ? `, ${order.endereco.numero}` : ''}
                {order.endereco.complemento ? ` - ${order.endereco.complemento}` : ''}<br />
                {order.endereco.bairro}{order.endereco.cidade ? ` - ${order.endereco.cidade}` : ''}
                {order.endereco.uf ? `/${order.endereco.uf}` : ''}<br />
                {order.endereco.cep && <>{t('zipCode')} {order.endereco.cep}</>}
              </address>
              {order.codigoRastreio && <p className="tracking-code">{t('tracking')}: <strong>{order.codigoRastreio}</strong></p>}
            </DetailCard>
          )}

          {!isSale && <PostPurchaseReviews order={order} />}
        </div>

        <aside className="detail-sidebar">
          <DetailCard title={isSale ? t('saleSummary') : t('purchaseSummary')}>
            {isSale ? (
              <>
                <ValueRow label={t('soldProducts')} value={formatBRL(getOrderValue(order))} />
                <div className="detail-total"><span>{t('saleTotal')}</span><strong>{formatBRL(getOrderValue(order))}</strong></div>
                <p className="detail-note">{t('sellerPartsOnly')}</p>
              </>
            ) : (
              <>
                <ValueRow label="Subtotal" value={formatBRL(order.subtotal)} />
                {Number(order.desconto || 0) > 0 && <ValueRow label="Desconto" value={`- ${formatBRL(order.desconto)}`} />}
                <ValueRow label={t('shipping')} value={Number(order.valorFrete) === 0 ? t('free') : formatBRL(order.valorFrete)} />
                <div className="detail-total"><span>{t('purchaseTotal')}</span><strong>{formatBRL(order.total)}</strong></div>
                {order.forma_pagamento?.nome && <p className="detail-payment">{t('payment')}: <strong>{order.forma_pagamento.nome}</strong></p>}
              </>
            )}
          </DetailCard>

          {!isSale && (
              <button type="button" className="detail-primary-action" onClick={onExplore}>
                {t('buyAgain')}
            </button>
          )}
          <button type="button" className="detail-secondary-action" onClick={onBack}>
            {t('backToHistory')}
          </button>
        </aside>
      </div>
    </PageShell>
  );
}

function PostPurchaseReviews({ order }) {
  const { t } = useLanguage();
  const [reviews, setReviews] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openForm, setOpenForm] = useState('');

  const liberada = order.status === ORDER_STATUS.ENTREGUE;

  async function loadReviews() {
    setLoading(true);
    setError('');
    try {
      setReviews(await buscarAvaliacoesPedido(order.id));
    } catch (loadError) {
      setError(loadError?.message || t('ordersHistoryLoadFailed'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setOpenForm('');
    if (liberada) {
      loadReviews();
    } else {
      setReviews(null);
      setError('');
    }
  }, [liberada, order.id]);

  async function submitReview(type, target, values) {
    if (type === 'fornecedor') {
      await avaliarFornecedor({
        pedido_id: order.id,
        fornecedor_id: target.fornecedor_id,
        ...values,
      });
    } else {
      await avaliarProduto({
        pedido_id: order.id,
        venda_id: target.venda_id,
        peca_id: target.peca_id,
        nota: values.nota,
        comentario: values.comentario,
      });
    }

    setOpenForm('');
    await loadReviews();
  }

  if (!liberada) {
    return (
      <DetailCard title={t('postPurchaseReviews')}>
        <div className="review-locked">
          <span aria-hidden="true">🔒</span>
          <div>
            <strong>{t('reviewsLocked')}</strong>
            <p>{t('reviewsLockedDescription')}</p>
          </div>
        </div>
      </DetailCard>
    );
  }

  return (
    <DetailCard title={t('ratePurchase')}>
      <p className="review-intro">
        {t('reviewIntro')}
      </p>

      {loading && !reviews && <div className="review-loading">{t('loadingReviews')}</div>}
      {error && (
        <div className="history-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={loadReviews}>{t('tryAgain')}</button>
        </div>
      )}

      {reviews && (
        <div className="review-groups">
          <ReviewGroup title={t('sellers')}>
            {reviews.fornecedores.map((target) => {
              const formKey = `fornecedor-${target.fornecedor_id}`;
              return (
                <ReviewTarget
                  key={formKey}
                  title={target.fornecedor_nome}
                  subtitle={t('sellerReviewSubtitle')}
                  review={target.avaliacao}
                  open={openForm === formKey}
                  onToggle={() => setOpenForm(openForm === formKey ? '' : formKey)}
                >
                  <ReviewForm
                    type="fornecedor"
                    onCancel={() => setOpenForm('')}
                    onSubmit={(values) => submitReview('fornecedor', target, values)}
                  />
                </ReviewTarget>
              );
            })}
          </ReviewGroup>

          <ReviewGroup title={t('productsLabel')}>
            {reviews.produtos.map((target) => {
              const formKey = `produto-${target.venda_id}`;
              return (
                <ReviewTarget
                  key={formKey}
                  title={target.nome}
                  subtitle={`${t('soldBy')} ${target.fornecedor_nome}`}
                  image={target.imagem}
                  review={target.avaliacao}
                  open={openForm === formKey}
                  onToggle={() => setOpenForm(openForm === formKey ? '' : formKey)}
                >
                  <ReviewForm
                    type="produto"
                    onCancel={() => setOpenForm('')}
                    onSubmit={(values) => submitReview('produto', target, values)}
                  />
                </ReviewTarget>
              );
            })}
          </ReviewGroup>
        </div>
      )}
    </DetailCard>
  );
}

function ReviewGroup({ title, children }) {
  return (
    <section className="review-group">
      <h3>{title}</h3>
      <div className="review-targets">{children}</div>
    </section>
  );
}

function ReviewTarget({ title, subtitle, image, review, open, onToggle, children }) {
  const { t } = useLanguage();
  return (
    <article className={`review-target${review ? ' is-reviewed' : ''}`}>
      <div className="review-target-header">
        {image && <img src={image} alt="" />}
        <div>
          <strong>{title}</strong>
          <span>{subtitle}</span>
        </div>
        {review ? (
          <span className="review-verified">{t('verifiedPurchase')}</span>
        ) : (
          <button type="button" onClick={onToggle}>{open ? t('close') : t('rate')}</button>
        )}
      </div>

      {review && (
        <div className="review-result">
          <span aria-label={`${review.nota} de 5 estrelas`}>{'★'.repeat(review.nota)}{'☆'.repeat(5 - review.nota)}</span>
          {review.comentario && <p>{review.comentario}</p>}
        </div>
      )}
      {!review && open && children}
    </article>
  );
}

function ReviewForm({ type, onSubmit, onCancel }) {
  const { t } = useLanguage();
  const [values, setValues] = useState({
    nota: 5,
    comentario: '',
    qualidade_peca: 5,
    comunicacao: 5,
    rapidez_entrega: 5,
    embalagem: 5,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const update = (field, value) => setValues((current) => ({ ...current, [field]: value }));

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError('');
    try {
      await onSubmit(values);
    } catch (error) {
      setSubmitError(error?.message || t('sendReviewFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="review-form" onSubmit={handleSubmit}>
      <RatingInput
        label={type === 'fornecedor' ? t('sellerOverallRating') : t('productRating')}
        value={values.nota}
        onChange={(value) => update('nota', value)}
      />

      {type === 'fornecedor' && (
        <div className="review-criteria">
          <RatingInput label={t('quality')} value={values.qualidade_peca} onChange={(value) => update('qualidade_peca', value)} />
          <RatingInput label={t('communication')} value={values.comunicacao} onChange={(value) => update('comunicacao', value)} />
          <RatingInput label={t('deliverySpeed')} value={values.rapidez_entrega} onChange={(value) => update('rapidez_entrega', value)} />
          <RatingInput label={t('packaging')} value={values.embalagem} onChange={(value) => update('embalagem', value)} />
        </div>
      )}

      <label className="review-comment">
        <span>{t('comment')} <small>({t('optional')})</small></span>
        <textarea
          value={values.comentario}
          onChange={(event) => update('comentario', event.target.value)}
          maxLength={1000}
          rows={3}
          placeholder={t('experiencePlaceholder')}
        />
      </label>

      {submitError && <div className="review-submit-error" role="alert">{submitError}</div>}
      <div className="review-form-actions">
        <button type="button" className="secondary" onClick={onCancel} disabled={submitting}>{t('cancel')}</button>
        <button type="submit" disabled={submitting}>{submitting ? t('sending') : t('publishReview')}</button>
      </div>
    </form>
  );
}

function RatingInput({ label, value, onChange }) {
  const { t } = useLanguage();
  return (
    <fieldset className="rating-input">
      <legend>{label}</legend>
      <div>
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            className={rating <= value ? 'active' : ''}
            onClick={() => onChange(rating)}
            aria-label={`${rating} ${rating === 1 ? t('star') : t('stars')}`}
            aria-pressed={rating === value}
          >
            ★
          </button>
        ))}
      </div>
    </fieldset>
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
