import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import Header from '../components/Header';
import Money from '../components/Money';
import service from '../services/avaliadorService';
import '../styles/Review.css';
export default function ValidarPecaPage() {
  const location = useLocation();
  const { pecaId } = useParams();
  const [data, setData] = useState(null), [answers, setAnswers] = useState({});
  const [comment, setComment] = useState(''), [error, setError] = useState(''), [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true; setLoading(true); setError('');
    service.getValidacaoPeca(pecaId).then(d => {
      if (!active) return; setData(d);
      setAnswers(Object.fromEntries((d.validacao?.respostas || []).map(r => [r.criterio_id, r.resposta])));
    }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [pecaId]);
  const criteria = data?.criterios || [];
  const pending = data?.peca.status_publicacao === 'pendente_validacao' && !message;
  const complete = criteria.length > 0 && criteria.every(c => !c.obrigatorio || answers[c.id] === true);
  async function decide(reject) {
    setBusy(true); setError('');
    const responses = criteria.map(c => ({ criterio_id: c.id, resposta: answers[c.id] === true }));
    try {
      const revision = data.peca.revisao_avaliacao;
      if (reject) await service.rejectValidacao(pecaId, comment, responses, revision);
      else await service.submitValidacao(pecaId, responses, comment, revision);
      setMessage(reject ? 'Peça reprovada. O vendedor foi notificado.' : 'Peça aprovada e publicada. O vendedor foi notificado.');
    } catch(e) { setError(e.message); } finally { setBusy(false); }
  }
  const p = data?.peca;
  return <><Header /><main className="review-page"><Link to={location.state?.from || '/avaliador'} state={location.state?.section ? { section: location.state.section } : undefined}>← Voltar à fila</Link>
    {loading && <p role="status">Carregando…</p>}{error && <p role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
    {p && <><h1>{p.nome_peca}</h1><p>Revisão {p.revisao_avaliacao} · {p.status_publicacao}</p>
      <div className="review-grid"><section className="review-card">
        {p.imagem && <img src={p.imagem} alt={p.nome_peca} />}
        {p.url_video && <video src={p.url_video} controls preload="metadata" />}
        <p><Money value={p.preco_base} currency={p.moeda_base} /></p>
        <dl>{[['SKU',p.sku],['Número de série',p.num_serie],['Comprimento (mm)',p.comprimento_mm],['Largura (mm)',p.largura_mm],
          ['Altura (mm)',p.altura_mm],['Peso (g)',p.peso_gramas],['Gravações',p.detalhes_gravacao],['Procedência',p.historico_proveniencia]]
          .map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value ?? 'Não informado'}</dd></div>)}</dl>
        <p>API de série: {p.status_api_serie}. Integração futura; confira a autenticidade manualmente.</p>
      </section><section className="review-card"><h2>Checklist obrigatório</h2>
        <p>Critérios preservados no envio desta revisão. Mudanças administrativas valem para os próximos envios.</p>
        {!criteria.length && <p role="alert">Sem critérios. A publicação está bloqueada; solicite configuração ao administrador e novo envio ao vendedor.</p>}
        <fieldset disabled={!pending || busy}>{criteria.map(c => <label className="review-check" key={c.id}>
          <input type="checkbox" checked={answers[c.id] === true} onChange={e => setAnswers(a => ({...a,[c.id]:e.target.checked}))} />
          <span>{c.nome_criterio} {c.obrigatorio ? '(obrigatório)' : '(opcional)'}<small>{c.descricao}</small></span>
        </label>)}</fieldset>
        <label>Observações / motivo da reprovação<textarea maxLength={5000} value={comment} disabled={!pending || busy} onChange={e => setComment(e.target.value)} /></label>
        <div className="review-actions"><button disabled={!pending || busy || !complete} onClick={() => decide(false)}>Concluir e publicar</button>
          <button disabled={!pending || busy || !comment.trim()} onClick={() => decide(true)}>Reprovar</button></div>
        {data.validacao?.decidida_em && <p>Decisão: {data.validacao.status}. {data.validacao.comentarios}</p>}
      </section></div></>}
  </main></>;
}

