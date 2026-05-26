import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Field, Input, ButtonPrimary, AlertError } from '../components/StyledComponents.jsx';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDER_RADIUS, FLEX_CENTER } from '../styles/theme.js';
import { mapSupabaseAuthError } from '../utils/friendlyErrors';

const REGEX = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
};

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: '',
    }));

    setError('');
  }

  function validateForm() {
    const newErrors = {};

    if (!form.email.trim()) {
      newErrors.email = 'Informe seu email.';
    } else if (!REGEX.email.test(form.email.trim())) {
      newErrors.email = 'Digite um email válido. Ex: nome@email.com';
    }

    if (!form.password.trim()) {
      newErrors.password = 'Informe sua senha.';
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await login(form.email.trim().toLowerCase(), form.password);
      const redirectTo = location.state?.from?.pathname || '/';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(mapSupabaseAuthError(err, 'login'));
    } finally {
      setLoading(false);
    }
  }

  const fieldErrorStyle = {
    color: COLORS.BORDEAUX,
    fontSize: '0.82rem',
    marginTop: '6px',
    fontWeight: 600,
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: COLORS.CREAM,
        ...FLEX_CENTER,
        padding: SPACING.XL,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '500px',
          backgroundColor: '#fff',
          borderRadius: BORDER_RADIUS.LG,
          border: `2px solid ${COLORS.BORDEAUX}22`,
          padding: SPACING.XL,
          boxShadow: SHADOWS.SM,
        }}
      >
        <div style={{ marginBottom: SPACING.XL }}>
          <span
            style={{
              display: 'inline-block',
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: COLORS.BORDEAUX,
              fontWeight: 700,
              marginBottom: SPACING.MD,
            }}
          >
            BigPeças
          </span>

          <h1 style={{ margin: 0, ...TYPOGRAPHY.H1, color: COLORS.DARK_TEXT, marginBottom: SPACING.SM }}>
            Entrar
          </h1>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: SPACING.LG }}>
            <Field label="Email" required>
              <Input
                type="email"
                name="email"
                placeholder="seuemail@exemplo.com"
                value={form.email}
                onChange={handleChange}
                required
              />
              {errors.email && <div style={fieldErrorStyle}>{errors.email}</div>}
            </Field>
          </div>

          <div style={{ marginBottom: SPACING.LG }}>
            <Field label="Senha" required>
              <Input
                type="password"
                name="password"
                placeholder="Digite sua senha"
                value={form.password}
                onChange={handleChange}
                required
              />
              {errors.password && <div style={fieldErrorStyle}>{errors.password}</div>}
            </Field>
          </div>

          {error && <AlertError>{error}</AlertError>}

          <ButtonPrimary
            type="submit"
            disabled={loading}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 8px 18px ${COLORS.BORDEAUX}33`;
                e.currentTarget.style.backgroundColor = COLORS.BORDEAUX;
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = `0 4px 12px ${COLORS.BORDEAUX}22`;
              e.currentTarget.style.backgroundColor = COLORS.BORDEAUX;
            }}
            style={{
              width: '100%',
              marginTop: SPACING.MD,
              padding: '14px 18px',
              border: 'none',
              outline: 'none',
              borderRadius: BORDER_RADIUS.MD,
              backgroundColor: COLORS.BORDEAUX,
              color: '#fff',
              fontSize: '1rem',
              fontWeight: 700,
              letterSpacing: '0.02em',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              boxShadow: `0 4px 12px ${COLORS.BORDEAUX}22`,
              transition: 'all 0.2s ease',
            }}
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
            gap: SPACING.MD,
          }}
        >
          <Link
            to="/cadastro-usuario"
            style={{
              fontSize: '0.875rem',
              color: COLORS.MUTED_TEXT,
              textDecoration: 'none',
            }}
          >
            Criar conta
          </Link>

          <Link
            to="/recuperar-senha"
            style={{
              fontSize: '0.875rem',
              color: COLORS.MUTED_TEXT,
              textDecoration: 'none',
            }}
          >
            Esqueci minha senha
          </Link>
        </div>
      </div>
    </div>
  );
}