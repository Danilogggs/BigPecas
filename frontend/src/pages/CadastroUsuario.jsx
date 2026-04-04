import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cadastrarUsuario } from '../services/usuarioService';
import { useAuth } from '../contexts/AuthContext';

const BORDEAUX = '#6B1E2D';
const CREAM = '#FAF6EF';
const CREAM_DARK = '#F4E9D8';
const GOLD = '#C2A878';
const DARK_TEXT = '#2C1A17';
const MUTED_TEXT = '#6A5F58';

const inputStyle = {
  padding: '0.75rem 1rem',
  border: `2px solid #DDD`,
  borderRadius: '0.5rem',
  fontSize: '0.95rem',
  backgroundColor: '#FAFAFA',
  width: '100%',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  color: DARK_TEXT,
  outline: 'none',
  transition: 'border-color 0.2s',
};

const labelStyle = {
  display: 'block',
  marginBottom: '0.35rem',
  fontSize: '0.875rem',
  fontWeight: 600,
  color: MUTED_TEXT,
};

function Field({ label, required, children }) {
  return (
    <div>
      <label style={labelStyle}>
        {label}
        {required && <span style={{ color: BORDEAUX, marginLeft: '0.2rem' }}>*</span>}
      </label>
      {children}
    </div>
  );
}

export default function CadastroUsuario() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    gender: '',
    cep: '',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

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

    if (form.password.length < 8) {
      setMessage({ type: 'error', text: 'A senha deve ter pelo menos 8 caracteres.' });
      return;
    }

    if (form.password !== form.confirmPassword) {
      setMessage({ type: 'error', text: 'As senhas não coincidem.' });
      return;
    }

    setLoading(true);

    try {
      // 1. Cria o usuário no Firebase Auth
      await register(form.email, form.password);

      // 2. Salva o perfil completo no MySQL via user-service
      try {
        await cadastrarUsuario({
          full_name: form.full_name,
          email: form.email,
          password: form.password,
          ...(form.gender && { gender: form.gender }),
          ...(form.cep && { cep: form.cep }),
        });
      } catch (mysqlErr) {
        // Firebase OK, MySQL falhou — usuário pode logar, mas perfil não foi salvo
        console.error('Perfil não salvo no banco:', mysqlErr.message);
        setMessage({
          type: 'success',
          text: 'Conta criada! Não foi possível salvar todos os dados do perfil, mas você já pode fazer login.',
        });
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      setMessage({ type: 'success', text: 'Cadastro realizado com sucesso!' });
      setTimeout(() => navigate('/login'), 2000);
    } catch (firebaseErr) {
      const mensagens = {
        'auth/email-already-in-use': 'Este e-mail já está cadastrado.',
        'auth/invalid-email': 'E-mail inválido.',
        'auth/weak-password': 'Senha fraca. Use pelo menos 8 caracteres.',
      };
      setMessage({ type: 'error', text: mensagens[firebaseErr.code] || 'Erro ao criar conta. Tente novamente.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: CREAM, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ backgroundColor: BORDEAUX, padding: '1rem 2rem', color: CREAM_DARK }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <p style={{ margin: 0, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.3em', opacity: 0.75 }}>
            Retro Garage
          </p>
          <h1 style={{ margin: '0.2rem 0 0', fontSize: '1.5rem', fontWeight: 700 }}>
            BigPeças
          </h1>
        </div>
      </header>

      {/* Subheader */}
      <div style={{ backgroundColor: CREAM_DARK, borderBottom: `1px solid ${GOLD}55`, padding: '1rem 2rem' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: DARK_TEXT }}>
            Criar conta
          </h2>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: MUTED_TEXT }}>
            Preencha os dados abaixo para se cadastrar na plataforma.
          </p>
        </div>
      </div>

      {/* Main */}
      <main style={{ flex: 1, padding: '2rem', overflow: 'auto' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>

          {/* Alert */}
          {message.text && (
            <div
              style={{
                padding: '0.875rem 1rem',
                marginBottom: '1.5rem',
                borderRadius: '0.625rem',
                backgroundColor: message.type === 'success' ? '#D1FAE5' : '#FEE2E2',
                color: message.type === 'success' ? '#065F46' : '#7F1D1D',
                border: `2px solid ${message.type === 'success' ? '#6EE7B7' : '#FCA5A5'}`,
                fontSize: '0.9rem',
                fontWeight: 500,
              }}
            >
              {message.text}
              {message.type === 'success' && (
                <span style={{ opacity: 0.7 }}> Redirecionando para o login...</span>
              )}
            </div>
          )}

          {/* Card */}
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '1rem',
              border: `2px solid ${BORDEAUX}22`,
              padding: '2rem',
              boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
            }}
          >
            <form onSubmit={handleSubmit} noValidate>

              {/* Seção: Dados Pessoais */}
              <section style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1rem', color: BORDEAUX, marginBottom: '1.25rem', fontWeight: 700, borderBottom: `1px solid ${GOLD}44`, paddingBottom: '0.5rem' }}>
                  Dados Pessoais
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <Field label="Nome completo" required>
                      <input
                        style={inputStyle}
                        type="text"
                        name="full_name"
                        placeholder="Ex: Maria Aparecida Silva"
                        value={form.full_name}
                        onChange={handleChange}
                        minLength={3}
                        maxLength={150}
                        required
                      />
                    </Field>
                  </div>

                  <Field label="Gênero">
                    <select
                      style={inputStyle}
                      name="gender"
                      value={form.gender}
                      onChange={handleChange}
                    >
                      <option value="">Prefiro não informar</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Feminino">Feminino</option>
                      <option value="Não-binário">Não-binário</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </Field>

                  <Field label="CEP">
                    <input
                      style={inputStyle}
                      type="text"
                      name="cep"
                      placeholder="00000-000"
                      value={form.cep}
                      onChange={handleCepChange}
                      maxLength={9}
                    />
                  </Field>
                </div>
              </section>

              {/* Seção: Acesso */}
              <section style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1rem', color: BORDEAUX, marginBottom: '1.25rem', fontWeight: 700, borderBottom: `1px solid ${GOLD}44`, paddingBottom: '0.5rem' }}>
                  Dados de Acesso
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
                  <Field label="Email" required>
                    <input
                      style={inputStyle}
                      type="email"
                      name="email"
                      placeholder="seuemail@exemplo.com"
                      value={form.email}
                      onChange={handleChange}
                      required
                    />
                  </Field>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                    <Field label="Senha" required>
                      <input
                        style={inputStyle}
                        type="password"
                        name="password"
                        placeholder="Mínimo 8 caracteres"
                        value={form.password}
                        onChange={handleChange}
                        minLength={8}
                        required
                      />
                    </Field>

                    <Field label="Confirmar senha" required>
                      <input
                        style={inputStyle}
                        type="password"
                        name="confirmPassword"
                        placeholder="Repita a senha"
                        value={form.confirmPassword}
                        onChange={handleChange}
                        required
                      />
                    </Field>
                  </div>
                </div>
              </section>

              {/* Botões */}
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
                <Link
                  to="/login"
                  style={{ fontSize: '0.875rem', color: MUTED_TEXT, textDecoration: 'none' }}
                >
                  Já tenho conta
                </Link>

                <button
                  type="button"
                  onClick={() => setForm({ full_name: '', email: '', password: '', confirmPassword: '', gender: '', cep: '' })}
                  style={{
                    padding: '0.7rem 1.25rem',
                    borderRadius: '0.5rem',
                    border: `2px solid ${BORDEAUX}`,
                    backgroundColor: 'transparent',
                    color: BORDEAUX,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                  }}
                >
                  Limpar
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '0.7rem 1.75rem',
                    borderRadius: '0.5rem',
                    backgroundColor: BORDEAUX,
                    color: CREAM_DARK,
                    fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                    border: 'none',
                    opacity: loading ? 0.7 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  {loading ? 'Cadastrando...' : '✓ Cadastrar'}
                </button>
              </div>

            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
