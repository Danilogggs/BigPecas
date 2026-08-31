import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { reviewRequest } from '../services/avaliadorService';
import '../styles/Review.css';
const empty = { nome_criterio: '', descricao: '', ativo: true, obrigatorio: true, ordem: 0 };
export default function AdminChecklistPage() {
  const [rows,setRows] = useState([]), [form,setForm] = useState(empty);
  const [error,setError] = useState(''), [notice,setNotice] = useState(''), [busy,setBusy] = useState(false);
  async function load() { setRows(await reviewRequest('/admin/avaliador/checklist-criterios')); }
  useEffect(() => { load().catch(e => setError(e.message)); }, []);
  async function save(e) {
    e.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      await reviewRequest('/admin/avaliador/checklist-criterios' + (form.id ? '/' + form.id : ''), form.id ? 'PUT' : 'POST', form);
      setForm(empty); await load(); setNotice('Critério salvo. Avaliações existentes mantêm seus critérios originais.');
    } catch(e) { setError(e.message); } finally { setBusy(false); }
  }
  return <><Header /><main className="review-page"><Link to="/admin">← Administração</Link><h1>Checklist de avaliação</h1>
    <p>Crie ou edite os critérios. A ordem numérica define a posição; desativar preserva o histórico.</p>
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    <div className="review-grid"><section>{rows.map(c => <article className="review-card" key={c.id}>
      <h2>{c.ordem}. {c.nome_criterio}</h2><p>{c.ativo ? 'Ativo' : 'Inativo'} · {c.obrigatorio ? 'Obrigatório' : 'Opcional'}</p>
      <p>{c.descricao}</p><button disabled={busy} onClick={() => setForm(c)}>Editar critério</button>
    </article>)}</section><form className="review-card" onSubmit={save}>
      <h2>{form.id ? 'Editar critério' : 'Novo critério'}</h2>
      <label>Texto<input required maxLength={300} value={form.nome_criterio} onChange={e => setForm({...form,nome_criterio:e.target.value})} /></label>
      <label>Descrição<textarea maxLength={2000} value={form.descricao || ''} onChange={e => setForm({...form,descricao:e.target.value})} /></label>
      <label>Ordem<input type="number" min="0" step="1" required value={form.ordem ?? 0} onChange={e => setForm({...form,ordem:Number(e.target.value)})} /></label>
      <label><input type="checkbox" checked={form.ativo} onChange={e => setForm({...form,ativo:e.target.checked})} /> Ativo</label>
      <label><input type="checkbox" checked={form.obrigatorio} onChange={e => setForm({...form,obrigatorio:e.target.checked})} /> Obrigatório</label>
      <div className="review-actions"><button disabled={busy}>Salvar</button><button type="button" disabled={busy} onClick={() => setForm(empty)}>Novo / cancelar</button></div>
    </form></div></main></>;
}

