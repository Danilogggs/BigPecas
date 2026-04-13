import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Field, Input, ButtonPrimary, AlertError, AlertSuccess } from '../components/StyledComponents';
import { SPACING } from '../styles/theme';
import { mapFirebaseAuthError } from '../utils/friendlyErrors';
import AuthCard from '../components/layouts/AuthCard';

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
      setError(mapFirebaseAuthError(err, 'resetPassword'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      eyebrow="BigPeças"
      title="Recuperar senha"
      subtitle="Informe seu email para receber o link de redefinição."
    >
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

        <ButtonPrimary
          type="submit"
          disabled={loading}
          style={{ width: '100%', marginTop: SPACING.SM, padding: `${SPACING.MD} ${SPACING.LG}` }}
        >
          {loading ? 'Enviando...' : 'Enviar email'}
        </ButtonPrimary>
      </form>

      <div style={{ marginTop: SPACING.XL }}>
        <Link to="/login" style={{ fontSize: '0.875rem', color: '#6A5F58', textDecoration: 'none' }}>
          ← Voltar para o login
        </Link>
      </div>
    </AuthCard>
  );
}
