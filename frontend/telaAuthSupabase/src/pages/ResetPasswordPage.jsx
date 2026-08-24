import LanguageSwitcher from '../components/LanguageSwitcher';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Field, Input, ButtonPrimary, AlertError, AlertSuccess } from '../components/StyledComponents';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDER_RADIUS, FLEX_CENTER } from '../styles/theme';
import { mapSupabaseAuthError } from '../utils/friendlyErrors';
import { getSupabaseClient } from '../services/supabase';
import { useLanguage } from '../contexts/LanguageContext';

const INITIAL_FORM = {
  password: '',
  confirmPassword: '',
};

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { updatePassword } = useAuth();
  const { t } = useLanguage();

  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseClient();
    let isMounted = true;

    async function checkRecoverySession() {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!isMounted) return;

        const hasSession = Boolean(data?.session?.access_token);
        setHasRecoverySession(hasSession);

        if (!hasSession) {
          setError('Link inválido ou expirado. Solicite um novo e-mail de recuperação de senha.');
        }
      } catch {
        if (!isMounted) return;
        setHasRecoverySession(false);
        setError('Não foi possível validar o link de recuperação. Solicite um novo e-mail.');
      } finally {
        if (isMounted) {
          setCheckingLink(false);
        }
      }
    }

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      if (event === 'PASSWORD_RECOVERY' && session?.access_token) {
        setHasRecoverySession(true);
        setError('');
        setCheckingLink(false);
      }
    });

    checkRecoverySession();

    return () => {
      isMounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: '',
    }));

    setError('');
    setSuccess('');
  }

  function validateForm() {
    const newErrors = {};

    if (!form.password.trim()) {
      newErrors.password = 'Informe a nova senha.';
    } else if (form.password.length < 8) {
      newErrors.password = 'A senha deve ter pelo menos 8 caracteres.';
    }

    if (!form.confirmPassword.trim()) {
      newErrors.confirmPassword = 'Confirme a nova senha.';
    } else if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'As senhas não conferem.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError('');
    setSuccess('');

    if (!hasRecoverySession) {
      setError('Link inválido ou expirado. Solicite um novo e-mail de recuperação de senha.');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await updatePassword(form.password);
      setSuccess('Senha redefinida com sucesso. Redirecionando para o login...');
      setForm(INITIAL_FORM);
      navigate('/login?senhaRedefinida=1', { replace: true });
    } catch (err) {
      setError(t(mapSupabaseAuthError(err, 'updatePassword')));
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
            {t('Redefinir senha')}
          </h1>

          <p style={{ marginTop: SPACING.SM, fontSize: '0.95rem', color: COLORS.MUTED_TEXT }}>
            {t('Cadastre uma nova senha para acessar sua conta novamente.')}
          </p>
        </div>

        {checkingLink ? (
          <p style={{ color: COLORS.MUTED_TEXT, margin: 0 }}>{t('Validando link de recuperação...')}</p>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div style={{ marginBottom: SPACING.LG }}>
              <Field label={t('Nova senha')} required>
                <Input
                  type="password"
                  name="password"
                  placeholder={t('Digite sua nova senha')}
                  value={form.password}
                  onChange={handleChange}
                  required
                  disabled={!hasRecoverySession || loading}
                />
                {errors.password && <div style={fieldErrorStyle}>{errors.password}</div>}
              </Field>
            </div>

            <div style={{ marginBottom: SPACING.LG }}>
              <Field label={t('Confirmar nova senha')} required>
                <Input
                  type="password"
                  name="confirmPassword"
                  placeholder={t('Confirme sua nova senha')}
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                  disabled={!hasRecoverySession || loading}
                />
                {errors.confirmPassword && <div style={fieldErrorStyle}>{errors.confirmPassword}</div>}
              </Field>
            </div>

            {error && <AlertError>{error}</AlertError>}
            {success && <AlertSuccess>{success}</AlertSuccess>}

            <ButtonPrimary
              type="submit"
              disabled={loading || !hasRecoverySession}
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
                cursor: loading || !hasRecoverySession ? 'not-allowed' : 'pointer',
                opacity: loading || !hasRecoverySession ? 0.7 : 1,
                boxShadow: `0 4px 12px ${COLORS.BORDEAUX}22`,
              }}
            >
              {loading ? t('Salvando...') : t('Salvar nova senha')}
            </ButtonPrimary>
          </form>
        )}

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
