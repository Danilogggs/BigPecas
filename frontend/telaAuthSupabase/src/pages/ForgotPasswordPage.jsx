import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Field, Input, ButtonPrimary, AlertError, AlertSuccess } from '../components/StyledComponents';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDER_RADIUS, FLEX_CENTER } from '../styles/theme';
import { mapSupabaseAuthError } from '../utils/friendlyErrors';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await resetPassword(email);
      setSuccess('Enviamos um link de recuperação para o seu email.');
    } catch (err) {
      setError(mapSupabaseAuthError(err, 'resetPassword'));
    } finally {
      setLoading(false);
    }
  }

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
            Recuperar senha
          </h1>
          <p style={{ margin: 0, marginTop: SPACING.SM, fontSize: '0.95rem', color: COLORS.MUTED_TEXT }}>
            Informe seu email para receber o link de redefinição.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: SPACING.LG }}>
            <Field label="Email" required>
              <Input
                type="email"
                placeholder="seuemail@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
          </div>

          {error && <AlertError>{error}</AlertError>}
          {success && <AlertSuccess>{success}</AlertSuccess>}

          <ButtonPrimary type="submit" disabled={loading} style={{ width: '100%', marginTop: SPACING.MD }}>
            {loading ? 'Enviando...' : 'Enviar email'}
          </ButtonPrimary>
        </form>

        <div style={{ marginTop: SPACING.XL }}>
          <Link to="/login" style={{ fontSize: '0.875rem', color: COLORS.MUTED_TEXT, textDecoration: 'none' }}>
            Voltar para o login
          </Link>
        </div>
      </div>
    </div>
  );
}
