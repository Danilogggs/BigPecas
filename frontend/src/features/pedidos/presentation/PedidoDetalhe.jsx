import { useState } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import {
  obterDataPedido,
  obterNomeItem,
  obterValorPedido,
  ORDER_STATUS,
} from '../domain/pedido';
import DetailCard from './DetailCard';
import PedidosShell from './PedidosShell';
import PostPurchaseReviews from './PostPurchaseReviews';
import StatusBadge from './StatusBadge';
import {
  formatarDataPedido,
  formatarMoeda,
  obterMetaStatus,
} from './pedidoPresentation';

export default function PedidoDetalhe({
  order,
  view,
  onBack,
  onStatusChange,
  onConfirmReceipt,
  onExplore,
}) {
  const { t, formatDate } = useLanguage();
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const meta = obterMetaStatus(order.status, t);
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
    <PedidosShell>
      <button type="button" className="detail-back" onClick={onBack}>← {t('backToHistory')}</button>

      <div className="detail-header">
        <div>
          <span>{isSale ? t('completedSale') : t('completedPurchase')}</span>
          <h1>{isSale ? t('sale') : t('order')} #{order.id}</h1>
          <p>{formatarDataPedido(obterDataPedido(order), formatDate)}</p>
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
                    {item.imagem ? <img src={item.imagem} alt={obterNomeItem(item)} /> : <span>⚙</span>}
                  </div>
                  <div>
                    <strong>{obterNomeItem(item)}</strong>
                    <span>{t('quantity')}: {item.quantidade} × {formatarMoeda(item.preco)}</span>
                    {!isSale && item.fornecedor_nome && <small>{t('soldBy')} {item.fornecedor_nome}</small>}
                  </div>
                  <b>{formatarMoeda(Number(item.preco || 0) * Number(item.quantidade || 1))}</b>
                </div>
              ))}
            </div>
          </DetailCard>

          <DetailCard title={t('progress')}>
            <div className="detail-timeline">
              {(order.historico.length
                ? order.historico
                : [{ status: order.status, data: obterDataPedido(order) }]
              ).map((event, index) => {
                const eventMeta = obterMetaStatus(event.status, t);
                return (
                  <div key={`${event.status}-${event.data}-${index}`}>
                    <span style={{ backgroundColor: eventMeta.color }}>{eventMeta.icone}</span>
                    <div>
                      <strong>{eventMeta.label}</strong>
                      <small>{formatarDataPedido(event.data, formatDate)}</small>
                    </div>
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
                <ValueRow label={t('soldProducts')} value={formatarMoeda(obterValorPedido(order))} />
                <div className="detail-total"><span>{t('saleTotal')}</span><strong>{formatarMoeda(obterValorPedido(order))}</strong></div>
                <p className="detail-note">{t('sellerPartsOnly')}</p>
              </>
            ) : (
              <>
                <ValueRow label="Subtotal" value={formatarMoeda(order.subtotal)} />
                {Number(order.desconto || 0) > 0 && <ValueRow label="Desconto" value={`- ${formatarMoeda(order.desconto)}`} />}
                <ValueRow label={t('shipping')} value={Number(order.valorFrete) === 0 ? t('free') : formatarMoeda(order.valorFrete)} />
                <div className="detail-total"><span>{t('purchaseTotal')}</span><strong>{formatarMoeda(order.total)}</strong></div>
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
    </PedidosShell>
  );
}

function ValueRow({ label, value }) {
  return <div className="value-row"><span>{label}</span><strong>{value}</strong></div>;
}
