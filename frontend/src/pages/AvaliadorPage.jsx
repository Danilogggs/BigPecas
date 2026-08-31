import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Money from '../components/Money';
import service from '../services/avaliadorService';
import '../styles/Review.css';
export default function AvaliadorPage() {
  const [rows, setRows] = useState([]), [stats, setStats] = useState(null);
  const [page, setPage] = useState(0), [loading, setLoading] = useState(true), [error, setError] = useState('');
  useEffect(() => {
    let active = true; setLoading(true); setError('');
    Promise.all([service.getPecasPendentes(20, page * 20), service.getEstatisticas()])
      .then(([data, counts]) => { if (active) { setRows(data); setStats(counts); } })
      .catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page]);
  return <><Header /><main className="review-page"><h1>Fila de avaliação</h1>
    <p>Confira a mídia e as informações da peça antes de decidir. Não avalie anúncios próprios.</p>
    {stats && <p>{stats.pendentes} pendentes · {stats.aprovadas} aprovadas por você · {stats.rejeitadas} reprovadas por você</p>}
    {error && <p role="alert">{error}</p>}{loading ? <p role="status">Carregando…</p> :
      <div className="review-grid">{rows.map(p => <article className="review-card" key={p.id}>
        {p.imagem ? <img src={p.imagem} alt={p.nome_peca} /> : <p>{p.url_video ? 'Anúncio com vídeo' : 'Sem mídia'}</p>}
        <h2>{p.nome_peca}</h2><p><Money value={p.preco_base} currency={p.moeda_base} /></p>
        <p>{p.users?.full_name}</p><Link to={'/avaliador/validar/' + p.id}>Avaliar anúncio</Link>
      </article>)}</div>}
    {!loading && !error && !rows.length && <p>Nenhum anúncio nesta página.</p>}
    <div className="review-actions"><button disabled={loading || !page} onClick={() => setPage(p => p - 1)}>Anterior</button>
      <span>Página {page + 1}</span><button disabled={loading || rows.length < 20} onClick={() => setPage(p => p + 1)}>Próxima</button></div>
  </main></>;
}

