import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buscarPerfilUsuario, cadastrarUsuario } from '../services/usuarioService';
import PageLayout from '../components/layouts/PageLayout';
import styles from './ProfilePage.module.css';

export default function ProfilePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ nome: '', email: '', genero: '', cep: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    async function loadProfile() {
      try {
        const perfil = await buscarPerfilUsuario();
        setForm({
          nome: perfil?.nome || '',
          email: perfil?.email || '',
          genero: perfil?.genero || '',
          cep: perfil?.cep || '',
        });
      } catch (error) {
        setMessage({ type: 'error', text: error?.message || 'Não foi possível carregar os dados do seu perfil agora.' });
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function formatCep(value) {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    if (digits.length > 5) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    return digits;
  }

  function handleCepChange(e) {
    setForm((prev) => ({ ...prev, cep: formatCep(e.target.value) }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!form.nome.trim()) {
      setMessage({ type: 'error', text: 'Informe seu nome completo.' });
      return;
    }

    setSaving(true);
    try {
      const perfilAtualizado = await cadastrarUsuario({
        nome: form.nome.trim(),
        email: form.email.trim(),
        genero: form.genero.trim(),
        cep: form.cep.trim(),
      });
      setForm({
        nome: perfilAtualizado?.nome || form.nome,
        email: perfilAtualizado?.email || form.email,
        genero: perfilAtualizado?.genero || form.genero,
        cep: perfilAtualizado?.cep || form.cep,
      });
      setMessage({ type: 'success', text: 'Perfil atualizado com sucesso.' });
    } catch (error) {
      setMessage({ type: 'error', text: error?.message || 'Não foi possível salvar os dados do seu perfil agora.' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <PageLayout>
        <div className={styles.loadingWrap}>
          <p className={styles.loadingText}>Carregando perfil...</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.eyebrow}>BigPeças</span>
            <h1 className={styles.title}>Editar Perfil</h1>
            <p className={styles.subtitle}>Atualize suas informações básicas.</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Nome completo</label>
              <input type="text" name="nome" value={form.nome} onChange={handleChange} className={styles.input} />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>E-mail</label>
              <input
                type="email"
                name="email"
                value={form.email}
                disabled
                className={`${styles.input} ${styles.inputDisabled}`}
              />
            </div>

            <div className={styles.gridTwo}>
              <div>
                <label className={styles.label}>Gênero</label>
                <input type="text" name="genero" value={form.genero} onChange={handleChange} className={styles.input} />
              </div>
              <div>
                <label className={styles.label}>CEP</label>
                <input
                  type="text"
                  name="cep"
                  value={form.cep}
                  onChange={handleCepChange}
                  placeholder="00000-000"
                  maxLength={9}
                  className={styles.input}
                />
              </div>
            </div>

            {message.text && (
              <div className={message.type === 'success' ? styles.alertSuccess : styles.alertError}>
                {message.text}
              </div>
            )}

            <div className={styles.btnRow}>
              <button type="submit" disabled={saving} className={styles.btnPrimary}>
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </button>
              <button type="button" onClick={() => navigate('/')} className={styles.btnOutline}>
                Voltar para home
              </button>
            </div>
          </form>
        </div>
      </main>
    </PageLayout>
  );
}
