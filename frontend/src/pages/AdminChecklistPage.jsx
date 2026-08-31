import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { reviewRequest } from '../services/avaliadorService';
import { useLanguage } from '../contexts/LanguageContext';
import '../styles/Review.css';
const empty = { nome_criterio: '', descricao: '', ativo: true, obrigatorio: true, ordem: 0 };
export default function AdminChecklistPage() {
  const { t } = useLanguage();
  const [rows,setRows] = useState([]), [form,setForm] = useState(empty);
  const [error,setError] = useState(''), [notice,setNotice] = useState(''), [busy,setBusy] = useState(false);
  async function load() { setRows(await reviewRequest('/admin/avaliador/checklist-criterios')); }
  useEffect(() => { load().catch(e => setError(e.message)); }, []);
  async function save(e) {
    e.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      await reviewRequest('/admin/avaliador/checklist-criterios' + (form.id ? '/' + form.id : ''), form.id ? 'PUT' : 'POST', form);
      setForm(empty); await load(); setNotice(t('criterionSavedNotice'));
    } catch(e) { setError(e.message); } finally { setBusy(false); }
  }
  return <><Header /><main className="review-page"><Link to="/admin">← {t('administration')}</Link><h1>{t('evaluationChecklist')}</h1>
    <p>{t('checklistAdminDescription')}</p>
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    <div className="review-grid"><section>{rows.map(c => <article className="review-card" key={c.id}>
      <h2>{c.ordem}. {c.nome_criterio}</h2><p>{t(c.ativo ? 'active' : 'inactive')} · {t(c.obrigatorio ? 'obrigatorio' : 'opcional')}</p>
      <p>{c.descricao}</p><button disabled={busy} onClick={() => setForm(c)}>{t('editCriterion')}</button>
    </article>)}</section><form className="review-card" onSubmit={save}>
      <h2>{t(form.id ? 'editCriterion' : 'newCriterion')}</h2>
      <label>{t('text')}<input required maxLength={300} value={form.nome_criterio} onChange={e => setForm({...form,nome_criterio:e.target.value})} /></label>
      <label>{t('description')}<textarea maxLength={2000} value={form.descricao || ''} onChange={e => setForm({...form,descricao:e.target.value})} /></label>
      <label>{t('ordem')}<input type="number" min="0" step="1" required value={form.ordem ?? 0} onChange={e => setForm({...form,ordem:Number(e.target.value)})} /></label>
      <label><input type="checkbox" checked={form.ativo} onChange={e => setForm({...form,ativo:e.target.checked})} /> {t('active')}</label>
      <label><input type="checkbox" checked={form.obrigatorio} onChange={e => setForm({...form,obrigatorio:e.target.checked})} /> {t('obrigatorio')}</label>
      <div className="review-actions"><button disabled={busy}>{t('save')}</button><button type="button" disabled={busy} onClick={() => setForm(empty)}>{t('newOrCancel')}</button></div>
    </form></div></main></>;
}

