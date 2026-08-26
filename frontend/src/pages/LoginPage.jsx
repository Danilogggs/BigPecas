import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { mapSupabaseAuthError } from '../utils/friendlyErrors';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

const REGEX = { email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ };

export default function LoginPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { login } = useAuth();
  const { t } = useLanguage();

  const [form, setForm]     = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = ({ target: { name, value } }) => {
    setForm((p) => ({ ...p, [name]: value }));
    setErrors((p) => ({ ...p, [name]: '' }));
    setError('');
  };

  const validate = () => {
    const e = {};
    if (!form.email.trim())                          e.email    = t('emailRequired');
    else if (!REGEX.email.test(form.email.trim()))   e.email    = t('validEmail');
    if (!form.password.trim())                       e.password = t('passwordRequired');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;
    setLoading(true);
    try {
      await login(form.email.trim().toLowerCase(), form.password);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setError(t(mapSupabaseAuthError(err, 'login')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <LanguageSwitcher className="auth-language-switcher" />
      {/* Painel esquerdo */}
      <div className="auth-panel-left">
        <div className="auth-panel-left__glow" />

        <div className="auth-panel-left__content">
          {/* Logo */}
          <div className="auth-panel-left__logo">
            <ShieldIcon />
            <span className="auth-panel-left__logo-text">
              <span style={{ color: '#fff' }}>Big</span>
              <span style={{ color: 'var(--bp-gold)' }}>Peças</span>
            </span>
          </div>

          <h1 className="auth-panel-left__heading">
            {t('loginHeroTitle')}<br />{t('loginHeroSubtitle')}
          </h1>

          <p className="auth-panel-left__sub">
            {t('loginHeroDescription')}
          </p>

          <div className="auth-panel-left__features">
            {[
              'loginFeatureListings',
              'loginFeatureOrders',
              'loginFeatureCuration',
            ].map((text) => (
              <div key={text} className="auth-panel-left__feature">
                <span className="auth-panel-left__feature-icon" aria-hidden="true">•</span>
                {t(text)}
              </div>
            ))}
          </div>
        </div>

        <div className="auth-panel-left__car">
          <CarSvg />
        </div>
      </div>

      {/* Painel direito */}
      <div className="auth-panel-right">
        <div className="auth-form-card">
          <p className="auth-form-tag">{t('accountAccess')}</p>
          <h2 className="auth-form-title">{t('enterAccount')}</h2>

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group" style={{ marginBottom: '1.1rem' }}>
              <label className="label" htmlFor="email">{t('email')}</label>
              <input
                id="email"
                className={`input ${errors.email ? 'error' : ''}`}
                type="email"
                name="email"
                placeholder={t('emailPlaceholder')}
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
              />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <div className="flex-between" style={{ marginBottom: '.4rem' }}>
                <label className="label" htmlFor="password">{t('password')}</label>
                <Link to="/recuperar-senha" style={{ fontSize: '.78rem', color: 'var(--bp-gold)', fontWeight: 600 }}>
                  {t('forgotPassword')}
                </Link>
              </div>
              <input
                id="password"
                className={`input ${errors.password ? 'error' : ''}`}
                type="password"
                name="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
              />
              {errors.password && <span className="field-error">{errors.password}</span>}
            </div>

            {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg"
              disabled={loading}
              style={{ borderRadius: 'var(--r-md)' }}
            >
              {loading ? <><span className="spinner" /> {t('loading')}</> : t('login')}
            </button>
          </form>

          <div className="auth-form-footer">
            <span>
              {t('noAccount')}{' '}
              <Link to="/cadastro-usuario">{t('signUp')}</Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShieldIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--bp-gold)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L3 6v6c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V6L12 2Z" />
      <path d="M9 12l2 2 4-4" strokeWidth="2" />
    </svg>
  );
}

function CarSvg() {
  return (
    <svg width="100%" viewBox="0 0 300 100" fill="none" stroke="rgba(201,168,76,.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M40 75 Q70 30 110 22 H200 Q240 22 268 55 L280 75" />
      <circle cx="75" cy="80" r="18" />
      <circle cx="220" cy="80" r="18" />
      <path d="M40 75 H280 Q295 75 295 60 V52 H40 Q25 52 25 65 V75 Z" />
      <path d="M115 22 Q120 5 140 5 H180 Q200 5 205 22" />
    </svg>
  );
}
