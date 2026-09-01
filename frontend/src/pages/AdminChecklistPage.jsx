import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { reviewRequest } from '../services/avaliadorService';
import { useLanguage } from '../contexts/LanguageContext';
import '../styles/Review.css';

const empty = { nome_criterio: '', descricao: '', ativo: true, obrigatorio: true, ordem: 1 };
const endpoint = '/admin/avaliador/checklist-criterios';

export default function AdminChecklistPage() {
  const { t } = useLanguage();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const data = await reviewRequest(endpoint);
    setRows(data);
    return data;
  }

  useEffect(() => { load().catch((e) => setError(e.message)); }, []);

  const edit = (criterion, index) => {
    setNotice('');
    setForm({ ...criterion, ordem: index + 1 });
  };

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const requestedPosition = Math.max(1, Number(form.ordem) || 1);
      const saved = await reviewRequest(endpoint + (form.id ? `/${form.id}` : ''), form.id ? 'PUT' : 'POST', {
        ...form,
        ordem: requestedPosition,
      });
      const remaining = rows.filter((item) => item.id !== saved.id);
      remaining.splice(Math.min(requestedPosition - 1, remaining.length), 0, saved);
      await Promise.all(remaining.map((item, index) => reviewRequest(`${endpoint}/${item.id}`, 'PUT', {
        ...item,
        ordem: index + 1,
      })));
      await load();
      setForm({ ...empty, ordem: rows.length + (form.id ? 0 : 2) });
      setNotice(t('criterionSavedNotice'));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const resetForm = () => setForm({ ...empty, ordem: rows.length + 1 });
  const maxPosition = Math.max(1, rows.length + (form.id ? 0 : 1));

  return <><Header /><main className="review-page checklist-admin-page">
    <Link to="/admin">← {t('administration')}</Link>
    <div className="checklist-admin-heading"><div><h1>{t('evaluationChecklist')}</h1><p>{t('checklistAdminDescription')}</p></div><span>{rows.length} critérios</span></div>
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    <div className="checklist-admin-layout">
      <section className="checklist-admin-list" aria-label="Critérios cadastrados">
        {rows.map((criterion, index) => <article className={`checklist-admin-item ${form.id === criterion.id ? 'is-editing' : ''}`} key={criterion.id}>
          <span className="checklist-admin-item__position">{index + 1}</span>
          <div><h2>{criterion.nome_criterio}</h2><p>{criterion.descricao || 'Sem descrição'}</p><small>{t(criterion.ativo ? 'active' : 'inactive')} · {t(criterion.obrigatorio ? 'obrigatorio' : 'opcional')}</small></div>
          <button type="button" disabled={busy} onClick={() => edit(criterion, index)}>{t('editCriterion')}</button>
        </article>)}
      </section>

      <form className="review-card checklist-admin-form" onSubmit={save}>
        <h2>{t(form.id ? 'editCriterion' : 'newCriterion')}</h2>
        <label>{t('text')}<input required maxLength={300} value={form.nome_criterio} onChange={(e) => setForm({ ...form, nome_criterio: e.target.value })} /></label>
        <label>{t('description')}<textarea maxLength={2000} value={form.descricao || ''} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></label>
        <label>Posição no checklist<select value={Math.min(form.ordem || 1, maxPosition)} onChange={(e) => setForm({ ...form, ordem: Number(e.target.value) })}>
          {Array.from({ length: maxPosition }, (_, index) => <option value={index + 1} key={index + 1}>{index + 1}ª posição</option>)}
        </select></label>
        <div className="checklist-admin-toggles">
          <label><input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} /> {t('active')}</label>
          <label><input type="checkbox" checked={form.obrigatorio} onChange={(e) => setForm({ ...form, obrigatorio: e.target.checked })} /> {t('obrigatorio')}</label>
        </div>
        <div className="review-actions"><button disabled={busy}>{t('save')}</button><button type="button" disabled={busy} onClick={resetForm}>{t('newOrCancel')}</button></div>
      </form>
    </div>
  </main></>;
}
