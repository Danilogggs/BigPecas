import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Field, Input, ButtonPrimary, AlertError, AlertSuccess } from '../components/StyledComponents';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDER_RADIUS, FLEX_CENTER } from '../styles/theme';
import { mapSupabaseAuthError } from '../utils/friendlyErrors';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useLanguage } from '../contexts/LanguageContext';

const REGEX = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
};

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const { t } = useLanguage();

  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    const value = e.target.value;

    setEmail(value);

    setErrors({});
    setError('');
    setSuccess('');
  }

  function validateForm() {
    const newErrors = {};

    if (!email.trim()) {
      newErrors.email = 'Informe seu email.';
    } else if (!REGEX.email.test(email.trim())) {
      newErrors.email = 'Digite um email válido. Ex: nome@email.com';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError('');
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await resetPassword(email.trim().toLowerCase());
      setSuccess('Enviamos um link de recuperação para o seu email.');
    } catch (err) {
      setError(t(mapSupabaseAuthError(err, 'resetPassword')));
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
      <LanguageSwitcher className="public-language-switcher" />
      <div
        style={{
          width: '100%',
          maxWidth: '500px',
          backgroundColor: 'var(--bp-surface)',
          borderRadius: BORDER_RADIUS.LG,
          border: `2px solid ${COLORS.BORDEAUX}22`,
          padding: SPACING.XL,
          boxShadow: SHADOWS.SM,
        }}
      >
        <div style={{ marginBottom: SPACING.XL }}>
          <img
            src="/logobigpecas_semtexto.png"
            alt="BigPeças"
            style={{
              display: 'block',
              width: '52px',
              height: '52px',
              objectFit: 'contain',
              marginBottom: SPACING.MD,
            }}
          />

          <h1 style={{ margin: 0, ...TYPOGRAPHY.H1, color: COLORS.DARK_TEXT, marginBottom: SPACING.SM }}>
            {t('Recuperar senha')}
          </h1>

          <p style={{ marginTop: SPACING.SM, fontSize: '0.95rem', color: COLORS.MUTED_TEXT }}>
            {t('Informe seu email para receber o link de redefinição.')}
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: SPACING.LG }}>
            <Field label={t('Email')} required>
              <Input
                type="email"
                placeholder={t('emailPlaceholder')}
                value={email}
                onChange={handleChange}
                required
              />
              {errors.email && <div style={fieldErrorStyle}>{errors.email}</div>}
            </Field>
          </div>

          {error && <AlertError>{error}</AlertError>}
          {success && <AlertSuccess>{success}</AlertSuccess>}

          <ButtonPrimary
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              marginTop: SPACING.MD,
              padding: '14px 18px',
              border: 'none',
              borderRadius: BORDER_RADIUS.MD,
              backgroundColor: COLORS.BORDEAUX,
              color: '#fff',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              boxShadow: `0 4px 12px ${COLORS.BORDEAUX}22`,
            }}
          >
            {loading ? t('Enviando...') : t('Enviar email')}
          </ButtonPrimary>
        </form>

        <div style={{ marginTop: SPACING.XL }}>
          <Link
            to="/login"
            style={{
              fontSize: '0.875rem',
              color: COLORS.MUTED_TEXT,
              textDecoration: 'none',
            }}
          >
            {t('Voltar para o login')}
          </Link>
        </div>
      </div>
    </div>
  );
}
