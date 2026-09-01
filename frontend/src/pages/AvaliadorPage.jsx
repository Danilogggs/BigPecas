import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Money from '../components/Money';
import service from '../services/avaliadorService';
import { useLanguage } from '../contexts/LanguageContext';
import '../styles/Review.css';

const PAGE_SIZE = 21;

function formatDate(value) {
  if (!value) return 'Não informado';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Não informado' : date.toLocaleDateString('pt-BR');
}

export default function AvaliadorPage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [sort, setSort] = useState('recent');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([
      service.getPecasPendentes(PAGE_SIZE, page * PAGE_SIZE, sort),
      service.getEstatisticas(),
    ])
      .then(([data, counts]) => { if (active) { setRows(data); setStats(counts); } })
      .catch((e) => { if (active) setError(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, sort]);

  const changeSort = (event) => {
    setSort(event.target.value);
    setPage(0);
  };

  return <><Header /><main className="review-page evaluator-page">
    <div className="evaluator-heading">
      <div><h1>{t('evaluatorQueue')}</h1><p>{t('evaluatorQueueDescription')}</p></div>
      <label className="evaluator-sort"><span>Ordenar por</span><select value={sort} onChange={changeSort}>
        <option value="recent">Mais recentes</option><option value="oldest">Mais antigos</option>
      </select></label>
    </div>
    {stats && <p className="evaluator-stats">{t('evaluatorStats', { pending: stats.pendentes, approved: stats.aprovadas, rejected: stats.rejeitadas })}</p>}
    {error && <p role="alert">{error}</p>}
    {loading ? <p role="status">{t('pageLoading')}</p> : <div className="review-grid evaluator-grid">{rows.map((part) => <article className="review-card evaluator-card" key={part.id}>
      <div className="evaluator-card__media">{part.imagem ? <img src={part.imagem} alt={part.nome_peca} /> : <span>{part.url_video ? t('listingWithVideo') : t('noMedia')}</span>}</div>
      <div className="evaluator-card__body">
        <div className="evaluator-card__title"><span>Anúncio #{part.id}</span><h2>{part.nome_peca || 'Peça sem nome'}</h2></div>
        <dl className="evaluator-card__data">
          <div><dt>Preço</dt><dd><Money value={part.preco_base ?? part.preco} currency={part.moeda_base || 'BRL'} /></dd></div>
          <div><dt>Fornecedor</dt><dd>{part.users?.full_name || 'Não informado'}</dd></div>
          <div><dt>SKU</dt><dd>{part.sku || part.oem_number || 'Não informado'}</dd></div>
          <div><dt>Condição</dt><dd>{part.condicao || 'Não informada'}</dd></div>
          <div><dt>Enviado em</dt><dd>{formatDate(part.data_cadastro || part.created_at)}</dd></div>
          <div><dt>Revisão</dt><dd>{part.revisao_avaliacao || 1}</dd></div>
        </dl>
        <Link className="evaluator-card__action" to={'/avaliador/validar/' + part.id}>{t('reviewListing')}</Link>
      </div>
    </article>)}</div>}
    {!loading && !error && !rows.length && <p>{t('noListingsOnPage')}</p>}
    <div className="review-actions evaluator-pagination"><button disabled={loading || !page} onClick={() => setPage((current) => current - 1)}>{t('previous')}</button><span>{t('pageNumber', { page: page + 1 })}</span><button disabled={loading || rows.length < PAGE_SIZE} onClick={() => setPage((current) => current + 1)}>{t('next')}</button></div>
  </main></>;
}
