import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import Header from '../components/Header';
import Money from '../components/Money';
import service from '../services/avaliadorService';
import { useLanguage } from '../contexts/LanguageContext';
import '../styles/Review.css';
export default function ValidarPecaPage() {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
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
      setMessage(t(reject ? 'partRejectedNotice' : 'partApprovedNotice'));
    } catch(e) { setError(e.message); } finally { setBusy(false); }
  }
  const p = data?.peca;
  return <><Header /><main className="review-page"><Link to={location.state?.from || '/avaliador'} state={location.state?.section ? { section: location.state.section } : undefined}>← {t('backToQueue')}</Link>
    {loading && <p role="status">{t('pageLoading')}</p>}{error && <p role="alert">{error}</p>}
    {p && <><h1>{p.nome_peca}</h1><p>{t('revisionAndStatus', { revision: p.revisao_avaliacao, status: p.status_publicacao })}</p>
      <div className="review-grid"><section className="review-card">
        {p.imagem && <img src={p.imagem} alt={p.nome_peca} />}
        {p.url_video && <video src={p.url_video} controls preload="metadata" />}
        <p><Money value={p.preco_base} currency={p.moeda_base} /></p>
        <dl>{[['SKU',p.sku],['Número de série',p.num_serie],['Comprimento (mm)',p.comprimento_mm],['Largura (mm)',p.largura_mm],
          ['Altura (mm)',p.altura_mm],['Peso (g)',p.peso_gramas],['Gravações',p.detalhes_gravacao],['Procedência',p.historico_proveniencia]]
          .map(([label,value]) => <div key={label}><dt>{t(label)}</dt><dd>{value ?? t('notProvided')}</dd></div>)}</dl>
        <p>{t('serialApiStatus', { status: p.status_api_serie })}</p>
      </section><section className="review-card"><h2>{t('mandatoryChecklist')}</h2>
        <p>{t('preservedCriteria')}</p>
        {!criteria.length && <p role="alert">{t('noCriteriaWarning')}</p>}
        <fieldset className="validation-checklist" disabled={!pending || busy}>{criteria.map(c => <label className="review-check" key={c.id}>
          <input type="checkbox" checked={answers[c.id] === true} onChange={e => setAnswers(a => ({...a,[c.id]:e.target.checked}))} />
          <span><strong>{c.nome_criterio}</strong><em>{t(c.obrigatorio ? 'requiredSuffix' : 'optionalSuffix')}</em>{c.descricao && <small>{c.descricao}</small>}</span>
        </label>)}</fieldset>
        <label>{t('rejectionNotes')}<textarea maxLength={5000} value={comment} disabled={!pending || busy} onChange={e => setComment(e.target.value)} /></label>
        <div className="review-actions"><button disabled={!pending || busy || !complete} onClick={() => decide(false)}>{t('completeAndPublish')}</button>
          <button disabled={!pending || busy || !comment.trim()} onClick={() => decide(true)}>{t('reject')}</button></div>
        {data.validacao?.decidida_em && <p>{t('decision', { status: data.validacao.status, comments: data.validacao.comentarios })}</p>}
      </section></div></>}
  </main>
    {message && <div className="review-result-backdrop" role="presentation">
      <section className="review-result-modal" role="dialog" aria-modal="true" aria-labelledby="review-result-title">
        <span className="review-result-modal__mark" aria-hidden="true">✓</span>
        <h2 id="review-result-title">Avaliação concluída</h2>
        <p role="status">{message}</p>
        <button type="button" autoFocus onClick={() => navigate('/avaliador')}>OK</button>
      </section>
    </div>}
  </>;
}

