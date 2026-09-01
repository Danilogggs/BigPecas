import { useEffect, useState } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import {
  avaliarFornecedor,
  avaliarProduto,
  buscarAvaliacoesPedido,
} from '../../../services/avaliacoesService';
import { ORDER_STATUS } from '../domain/pedido';
import DetailCard from './DetailCard';
import { AppIcon } from '../../../components/Icons';

export default function PostPurchaseReviews({ order }) {
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
          <span aria-hidden="true"><AppIcon name="lock" size={18} /></span>
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
      <p className="review-intro">{t('reviewIntro')}</p>

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
          <span aria-label={`${review.nota} de 5 estrelas`}>
            {'★'.repeat(review.nota)}{'☆'.repeat(5 - review.nota)}
          </span>
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
