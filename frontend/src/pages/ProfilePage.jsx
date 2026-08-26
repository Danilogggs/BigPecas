import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { buscarPerfilUsuario, salvarPerfilUsuario } from '../services/usuarioService';
import { useLanguage } from '../contexts/LanguageContext';
import {
  criarEstadoPerfil,
  formatarCepPerfil,
  formatarTelefonePerfil,
  validarPerfilUsuario,
} from '../features/usuarios/domain/usuario';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [form, setForm] = useState(() => criarEstadoPerfil());
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    async function loadProfile() {
      try {
        const perfil = await buscarPerfilUsuario();

        setForm(criarEstadoPerfil(perfil));
      } catch (error) {
        setMessage({
          type: 'error',
          text: error?.message || 'Não foi possível carregar os dados do seu perfil agora.',
        });
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  function clearFieldError(fieldName) {
    setErrors((prev) => ({
      ...prev,
      [fieldName]: '',
    }));
  }

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    clearFieldError(name);
    setMessage({ type: '', text: '' });
  }

  function handleCepChange(e) {
    setForm((prev) => ({
      ...prev,
      cep: formatarCepPerfil(e.target.value),
    }));

    clearFieldError('cep');
    setMessage({ type: '', text: '' });
  }

  function handleTelefoneChange(e) {
    setForm((prev) => ({
      ...prev,
      telefone: formatarTelefonePerfil(e.target.value),
    }));

    clearFieldError('telefone');
    setMessage({ type: '', text: '' });
  }

  function validateForm() {
    const newErrors = validarPerfilUsuario(form);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setMessage({ type: '', text: '' });

    if (!validateForm()) {
      setMessage({
        type: 'error',
        text: 'Corrija os campos destacados antes de salvar.',
      });
      return;
    }

    setSaving(true);

    try {
      const perfilAtualizado = await salvarPerfilUsuario({
        full_name: form.full_name.trim(),
        gender: form.gender.trim(),
        cep: form.cep.trim(),
        tipo_usuario: 'ambos',
        nome_loja: form.nome_loja.trim(),
        descricao_loja: form.descricao_loja.trim(),
        telefone: form.telefone.trim(),
        receber_email_notificacao_venda: form.receber_email_notificacao_venda,
      });

      setForm(criarEstadoPerfil({ ...form, ...perfilAtualizado }));

      setErrors({});
      setMessage({ type: 'success', text: 'Perfil atualizado com sucesso.' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error?.message || 'Não foi possível salvar os dados do seu perfil agora.',
      });
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '14px 16px',
    borderRadius: '12px',
    border: '1px solid #d1d5db',
    fontSize: '15px',
  };

  function getInputStyle(fieldName, disabled = false) {
    return {
      ...inputStyle,
      backgroundColor: disabled ? 'var(--bp-surface-muted)' : 'var(--bp-surface)',
      color: 'var(--bp-text)',
      border: errors[fieldName] ? '1.5px solid var(--bp-error)' : '1px solid var(--bp-border)',
      boxShadow: errors[fieldName] ? '0 0 0 3px rgba(185, 28, 28, 0.10)' : 'none',
    };
  }

  const labelStyle = {
    display: 'block',
    marginBottom: '8px',
    color: 'var(--bp-text-sub)',
    fontWeight: 600,
  };

  const fieldErrorStyle = {
    color: '#B91C1C',
    fontSize: '0.82rem',
    marginTop: '6px',
    fontWeight: 600,
  };

  function FieldError({ name }) {
    if (!errors[name]) return null;
    return <div style={fieldErrorStyle}>{errors[name]}</div>;
  }

  if (loading) {
    return (
      <div className="profile-page" style={{ minHeight: '100vh', backgroundColor: 'var(--bp-cream)' }}>
        <Header />
        <main style={{ padding: '2rem', color: 'var(--bp-text-sub)' }}>
          {t('Carregando perfil...')}
        </main>
      </div>
    );
  }

  return (
    <div className="profile-page"
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bp-cream)',
      }}
    >
      <Header />
      <main style={{ padding: '40px 20px' }}>
      <div
        style={{
          maxWidth: '720px',
          margin: '0 auto',
          backgroundColor: 'var(--bp-surface)',
          border: '1px solid var(--bp-border-light)',
          borderRadius: '24px',
          padding: '32px',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 'clamp(1.75rem, 6vw, 2rem)',
            fontWeight: 700,
            color: 'var(--bp-text)',
          }}
        >
          {t('Editar Perfil')}
        </h1>

        <p
          style={{
            marginTop: '8px',
            marginBottom: '24px',
            color: 'var(--bp-text-muted)',
          }}
        >
          {t('Atualize suas informações básicas.')}
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>{t('Nome completo')} *</label>
            <input
              type="text"
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              style={getInputStyle('full_name')}
            />
            <FieldError name="full_name" />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>{t('email')}</label>
            <input
              type="email"
              name="email"
              value={form.email}
              disabled
              style={getInputStyle('email', true)}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>{t('Gênero')}</label>
            <select
              name="gender"
              value={form.gender}
              onChange={handleChange}
              style={getInputStyle('gender')}
            >
              <option value="">{t('Prefiro não informar')}</option>
              <option value="Masculino">{t('male')}</option>
              <option value="Feminino">{t('female')}</option>
              <option value="Não-binário">{t('nonBinary')}</option>
              <option value="Outro">{t('other')}</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '16px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>{t('zipCode')} *</label>
              <input
                type="text"
                name="cep"
                value={form.cep}
                onChange={handleCepChange}
                placeholder={t('zipPlaceholder')}
                maxLength={9}
                style={getInputStyle('cep')}
              />
              <FieldError name="cep" />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>{t('phone')} *</label>
              <input
                type="text"
                name="telefone"
                value={form.telefone}
                onChange={handleTelefoneChange}
                placeholder={t('phoneMaskPlaceholder')}
                maxLength={15}
                style={getInputStyle('telefone')}
              />
              <FieldError name="telefone" />
            </div>
          </div>

          <div
            style={{
              margin: '8px 0 16px',
              padding: '14px 16px',
              borderRadius: '12px',
              backgroundColor: 'var(--bp-surface-muted)',
              color: 'var(--bp-text-muted)',
              lineHeight: 1.5,
            }}
          >
            {t('Toda conta pode comprar e vender. Os dados abaixo só se tornam obrigatórios ao anunciar a primeira peça.')}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>{t('Nome da loja')}</label>
            <input
              type="text"
              name="nome_loja"
              value={form.nome_loja}
              onChange={handleChange}
              style={getInputStyle('nome_loja')}
            />
            <FieldError name="nome_loja" />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>{t('Descrição da loja')}</label>
            <textarea
              name="descricao_loja"
              value={form.descricao_loja}
              onChange={handleChange}
              rows={4}
              style={{
                ...getInputStyle('descricao_loja'),
                resize: 'vertical',
              }}
            />
            <FieldError name="descricao_loja" />
          </div>

          <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="checkbox"
              id="receber-email-notificacao-venda"
              checked={Boolean(form.receber_email_notificacao_venda)}
              onChange={() => setForm((prev) => ({
                ...prev,
                receber_email_notificacao_venda: !prev.receber_email_notificacao_venda,
              }))}
              style={{ width: '18px', height: '18px', accentColor: 'var(--bp-gold)' }}
            />
            <label htmlFor="receber-email-notificacao-venda" style={{ color: 'var(--bp-text)', fontWeight: 600, cursor: 'pointer' }}>
              {t('Receber e-mail ao confirmar uma venda')}
            </label>
          </div>

          {message.text && (
            <p
              style={{
                marginTop: '8px',
                marginBottom: '16px',
                color: message.type === 'success' ? 'var(--bp-success)' : 'var(--bp-error)',
                fontWeight: 500,
              }}
            >
              {message.text}
            </p>
          )}

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                border: 'none',
                borderRadius: '9999px',
                padding: '12px 24px',
                backgroundColor: 'var(--bp-gold)',
                color: 'var(--bp-green-900)',
                fontWeight: 700,
                fontSize: '15px',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? t('Salvando...') : t('Salvar alterações')}
            </button>

            <button
              type="button"
              onClick={() => navigate('/editar-pecas')}
              style={{
                border: '1px solid var(--bp-border)',
                borderRadius: '9999px',
                padding: '12px 24px',
                backgroundColor: 'var(--bp-surface)',
                color: 'var(--bp-text)',
                fontWeight: 700,
                fontSize: '15px',
                cursor: 'pointer',
              }}
            >
              {t('Editar minhas peças')}
            </button>

            <button
              type="button"
              onClick={() => navigate('/')}
              style={{
                border: '1px solid var(--bp-border)',
                borderRadius: '9999px',
                padding: '12px 24px',
                backgroundColor: 'var(--bp-surface)',
                color: 'var(--bp-text)',
                fontWeight: 700,
                fontSize: '15px',
                cursor: 'pointer',
              }}
            >
              {t('Voltar para home')}
            </button>
          </div>
        </form>
      </div>
      </main>
    </div>
  );
}
