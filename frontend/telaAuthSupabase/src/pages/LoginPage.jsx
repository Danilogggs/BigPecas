import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Field, Input, ButtonPrimary, AlertError } from '../components/StyledComponents.jsx';
import { SPACING } from '../styles/theme.js';
import { mapFirebaseAuthError } from '../utils/friendlyErrors';
import AuthCard from '../components/layouts/AuthCard';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(mapFirebaseAuthError(err, 'login'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard eyebrow="BigPeças" title="Entrar" subtitle="Acesse sua conta para gerenciar anúncios e peças.">
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: SPACING.LG }}>
          <Field label="Email" required>
            <Input
              type="email"
              placeholder="seuemail@exemplo.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </Field>
        </div>

        <div style={{ marginBottom: SPACING.LG }}>
          <Field label="Senha" required>
            <Input
              type="password"
              placeholder="Digite sua senha"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </Field>
        </div>

        {error && <AlertError>{error}</AlertError>}

        <ButtonPrimary
          type="submit"
          disabled={loading}
          style={{ width: '100%', marginTop: SPACING.SM, padding: `${SPACING.MD} ${SPACING.LG}` }}
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </ButtonPrimary>
      </form>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: SPACING.XL,
          flexWrap: 'wrap',
          gap: SPACING.SM,
        }}
      >
        <Link to="/cadastro-usuario" style={{ fontSize: '0.875rem', color: '#6A5F58', textDecoration: 'none' }}>
          Criar conta
        </Link>
        <Link to="/recuperar-senha" style={{ fontSize: '0.875rem', color: '#6A5F58', textDecoration: 'none' }}>
          Esqueci minha senha
        </Link>
      </div>
    </AuthCard>
  );
}
