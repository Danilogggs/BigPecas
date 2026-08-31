import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Money from '../components/Money';
import service from '../services/avaliadorService';
import { useLanguage } from '../contexts/LanguageContext';
import '../styles/Review.css';
export default function AvaliadorPage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState([]), [stats, setStats] = useState(null);
  const [page, setPage] = useState(0), [loading, setLoading] = useState(true), [error, setError] = useState('');
  useEffect(() => {
    let active = true; setLoading(true); setError('');
    Promise.all([service.getPecasPendentes(20, page * 20), service.getEstatisticas()])
      .then(([data, counts]) => { if (active) { setRows(data); setStats(counts); } })
      .catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page]);
  return <><Header /><main className="review-page"><h1>{t('evaluatorQueue')}</h1>
    <p>{t('evaluatorQueueDescription')}</p>
    {stats && <p>{t('evaluatorStats', { pending: stats.pendentes, approved: stats.aprovadas, rejected: stats.rejeitadas })}</p>}
    {error && <p role="alert">{error}</p>}{loading ? <p role="status">{t('pageLoading')}</p> :
      <div className="review-grid">{rows.map(p => <article className="review-card" key={p.id}>
        {p.imagem ? <img src={p.imagem} alt={p.nome_peca} /> : <p>{p.url_video ? t('listingWithVideo') : t('noMedia')}</p>}
        <h2>{p.nome_peca}</h2><p><Money value={p.preco_base} currency={p.moeda_base} /></p>
        <p>{p.users?.full_name}</p><Link to={'/avaliador/validar/' + p.id}>{t('reviewListing')}</Link>
      </article>)}</div>}
    {!loading && !error && !rows.length && <p>{t('noListingsOnPage')}</p>}
    <div className="review-actions"><button disabled={loading || !page} onClick={() => setPage(p => p - 1)}>{t('previous')}</button>
      <span>{t('pageNumber', { page: page + 1 })}</span><button disabled={loading || rows.length < 20} onClick={() => setPage(p => p + 1)}>{t('next')}</button></div>
  </main></>;
}

