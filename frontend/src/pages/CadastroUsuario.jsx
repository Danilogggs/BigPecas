import LanguageSwitcher from '../components/LanguageSwitcher';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Field, Input, ButtonPrimary, AlertError, AlertSuccess } from '../components/StyledComponents';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, FLEX_CENTER, GRID_TWO_COLUMNS } from '../styles/theme';
import { mapSupabaseAuthError } from '../utils/friendlyErrors';
import { useLanguage } from '../contexts/LanguageContext';

const INITIAL_FORM = {
  full_name: '',
  email: '',
  password: '',
  confirmPassword: '',
  gender: '',
  cep: '',
  telefone: '',
};

const GENDER_OPTIONS = [
  { value: '', labelKey: 'preferNotToInform' },
  { value: 'Masculino', labelKey: 'male' },
  { value: 'Feminino', labelKey: 'female' },
  { value: 'Não-binário', labelKey: 'nonBinary' },
  { value: 'Outro', labelKey: 'other' },
];

const REGEX = {
  nome: /^[A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)+$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  senha: /^(?=.*[A-Za-z])(?=.*\d).{8,}$/,
  cep: /^\d{5}-\d{3}$/,
  telefone: /^\(\d{2}\)\s\d{4,5}-\d{4}$/,
};

export default function CadastroUsuario() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { t } = useLanguage();

  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [errors, setErrors] = useState({});

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
  }

  function handleGenderSelect(value) {
    setForm((prev) => ({
      ...prev,
      gender: value,
    }));
  }

  function formatCep(value) {
    const digits = value.replace(/\D/g, '').slice(0, 8);

    if (digits.length > 5) {
      return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    }

    return digits;
  }

  function formatTelefone(value) {
    const digits = value.replace(/\D/g, '').slice(0, 11);

    if (digits.length > 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }

    if (digits.length > 6) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }

    if (digits.length > 2) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    }

    return digits;
  }

  function handleCepChange(e) {
    setForm((prev) => ({
      ...prev,
      cep: formatCep(e.target.value),
    }));

    clearFieldError('cep');
  }

  function handleTelefoneChange(e) {
    setForm((prev) => ({
      ...prev,
      telefone: formatTelefone(e.target.value),
    }));

    clearFieldError('telefone');
  }

  function validateForm() {
    const newErrors = {};

    if (!form.full_name.trim()) {
      newErrors.full_name = 'Informe seu nome completo.';
    } else if (!REGEX.nome.test(form.full_name.trim())) {
      newErrors.full_name = 'Digite nome e sobrenome usando apenas letras.';
    }

    if (!form.telefone.trim()) {
      newErrors.telefone = 'Informe seu telefone.';
    } else if (!REGEX.telefone.test(form.telefone.trim())) {
      newErrors.telefone = 'Digite um telefone válido com DDD. Ex: (41) 99999-9999.';
    }

    if (!form.cep.trim()) {
      newErrors.cep = 'Informe seu CEP.';
    } else if (!REGEX.cep.test(form.cep.trim())) {
      newErrors.cep = 'Digite um CEP válido no formato 00000-000.';
    }

    if (!form.email.trim()) {
      newErrors.email = 'Informe seu email.';
    } else if (!REGEX.email.test(form.email.trim())) {
      newErrors.email = 'Digite um email válido. Ex: nome@email.com';
    }

    if (!form.password) {
      newErrors.password = 'Informe uma senha.';
    } else if (!REGEX.senha.test(form.password)) {
      newErrors.password = 'A senha deve ter no mínimo 8 caracteres, com letras e números.';
    }

    if (!form.confirmPassword) {
      newErrors.confirmPassword = 'Confirme sua senha.';
    } else if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'As senhas digitadas não são iguais.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setMessage({ type: '', text: '' });

    if (!validateForm()) {
      setMessage({ type: 'error', text: 'Corrija os campos destacados antes de continuar.' });
      return;
    }

    setLoading(true);

    try {
      await register({
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        gender: form.gender.trim(),
        cep: form.cep.trim(),
        tipo_usuario: form.tipo_usuario || 'ambos',
        nome_loja: '',
        descricao_loja: '',
        telefone: form.telefone.trim(),
      });

      setMessage({ type: 'success', text: t('accountCreatedCheckEmail') });
      setTimeout(() => navigate('/login'), 3500);
    } catch (error) {
      setMessage({ type: 'error', text: t(mapSupabaseAuthError(error, 'register')) });
    } finally {
      setLoading(false);
    }
  }

  const dividerStyle = {
    border: 'none',
    borderTop: `1px solid ${COLORS.BORDEAUX}18`,
    margin: `${SPACING.XL} 0`,
  };

  const fieldErrorStyle = {
    color: COLORS.BORDEAUX,
    fontSize: '0.82rem',
    marginTop: '6px',
    fontWeight: 600,
  };

  return (
    <div className="auth-layout">
      <LanguageSwitcher className="auth-language-switcher" />
      {/* Painel esquerdo */}
      <div className="auth-panel-left">
        <div className="auth-panel-left__glow" />
        <div className="auth-panel-left__content">
          <div className="auth-panel-left__logo">
            <img src="/logobigpecas_semtexto.png" alt="BigPeças" />
          </div>
          <h1 className="auth-panel-left__heading">
            {t('joinClassicCommunity')}<br />{t('communitySubtitle')}
          </h1>
          <p className="auth-panel-left__sub">
            {t('loginHeroDescription')}
          </p>
          <div className="auth-panel-left__features">
            {[t('loginFeatureListings'), t('loginFeatureOrders'), t('loginFeatureCuration')].map((label) => (
              <div key={label} className="auth-panel-left__feature">
                <span className="auth-panel-left__feature-icon" aria-hidden="true">•</span>{label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Painel direito — scrollável */}
      <div className="auth-panel-right" style={{ alignItems: 'flex-start', overflowY: 'auto', padding: '2rem' }}>
      <div
        style={{
          width: '100%',
          maxWidth: '680px',
          backgroundColor: 'var(--bp-surface)',
          borderRadius: 'var(--r-2xl)',
          border: '1px solid var(--bp-border-light)',
          padding: '2.5rem',
          boxShadow: 'var(--shadow-md)',
          margin: 'auto',
        }}
      >
        <div style={{ marginBottom: '1.75rem' }}>
          <p className="auth-form-tag">{t('newAccount')}</p>
          <h2 className="auth-form-title" style={{ marginBottom: 0 }}>{t('createAccount')}</h2>
        </div>

        {message.text && (
          message.type === 'success' ? (
            <AlertSuccess>
              <div>{message.text}</div>
              <div style={{ fontSize: '0.85rem', marginTop: SPACING.SM, opacity: 0.8 }}>
                {t('redirectingToLogin')}
              </div>
            </AlertSuccess>
          ) : (
            <AlertError>{message.text}</AlertError>
          )
        )}

        <form onSubmit={handleSubmit} noValidate>
          <label style={{ display: 'block', marginBottom: 20 }}>{t('profile')}
            <select name="tipo_usuario" value={form.tipo_usuario || 'ambos'} onChange={handleChange}>
              <option value="ambos">{t('buyerSeller')}</option>
              <option value="avaliador">{t('evaluatorRole')}</option>
            </select>
          </label>
          <div style={{ marginBottom: SPACING.LG }}>
            <Field label={t('Nome completo')} required>
              <Input
                type="text"
                name="full_name"
                placeholder={t('fullNamePlaceholder')}
                value={form.full_name}
                onChange={handleChange}
                minLength={3}
                maxLength={150}
                required
              />
              {errors.full_name && <div style={fieldErrorStyle}>{errors.full_name}</div>}
            </Field>
          </div>

          <div style={{ marginBottom: SPACING.LG }}>
            <div
              style={{
                fontSize: '0.95rem',
                fontWeight: 700,
                color: COLORS.DARK_TEXT,
                marginBottom: SPACING.SM,
              }}
            >
              {t('genderLabel')}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: SPACING.SM }}>
              {GENDER_OPTIONS.map((option) => {
                const selected = form.gender === option.value;

                return (
                  <button
                    key={option.value || option.labelKey}
                    type="button"
                    onClick={() => handleGenderSelect(option.value)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '999px',
                      border: selected ? `1.5px solid ${COLORS.BORDEAUX}` : `1px solid ${COLORS.BORDEAUX}24`,
                      backgroundColor: selected ? `${COLORS.BORDEAUX}12` : '#fff',
                      color: selected ? COLORS.BORDEAUX : COLORS.DARK_TEXT,
                      fontSize: '0.92rem',
                      fontWeight: selected ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: selected ? `0 4px 10px ${COLORS.BORDEAUX}14` : 'none',
                    }}
                  >
                    {t(option.labelKey)}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ ...GRID_TWO_COLUMNS, marginBottom: SPACING.LG }}>
            <Field label={t('phone')} required>
              <Input
                type="text"
                name="telefone"
                placeholder={t('phoneMaskPlaceholder')}
                value={form.telefone}
                onChange={handleTelefoneChange}
                maxLength={15}
                required
              />
              {errors.telefone && <div style={fieldErrorStyle}>{errors.telefone}</div>}
            </Field>

            <Field label={t('zipCode')} required>
              <Input
                type="text"
                name="cep"
                placeholder={t('zipPlaceholder')}
                value={form.cep}
                onChange={handleCepChange}
                maxLength={9}
                required
              />
              {errors.cep && <div style={fieldErrorStyle}>{errors.cep}</div>}
            </Field>
          </div>

          <hr style={dividerStyle} />

          <div style={{ marginBottom: SPACING.LG }}>
            <Field label={t('email')} required>
              <Input
                type="email"
                name="email"
                placeholder={t('emailPlaceholder')}
                value={form.email}
                onChange={handleChange}
                required
              />
              {errors.email && <div style={fieldErrorStyle}>{errors.email}</div>}
            </Field>
          </div>

          <div style={{ ...GRID_TWO_COLUMNS, marginBottom: SPACING.XL }}>
            <Field label={t('password')} required>
              <Input
                type="password"
                name="password"
                placeholder={t('passwordMinPlaceholder')}
                value={form.password}
                onChange={handleChange}
                required
              />
              {errors.password && <div style={fieldErrorStyle}>{errors.password}</div>}
            </Field>

            <Field label={t('confirmPassword')} required>
              <Input
                type="password"
                name="confirmPassword"
                placeholder={t('confirmPasswordPlaceholder')}
                value={form.confirmPassword}
                onChange={handleChange}
                required
              />
              {errors.confirmPassword && <div style={fieldErrorStyle}>{errors.confirmPassword}</div>}
            </Field>
          </div>

          <ButtonPrimary
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
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
            {loading ? t('creatingAccount') : t('createAccountAction')}
          </ButtonPrimary>
        </form>

        <div
          style={{
            marginTop: SPACING.XL,
            fontSize: '0.92rem',
            color: COLORS.MUTED_TEXT,
            textAlign: 'center',
          }}
        >
          {t('alreadyHaveAccount')}{' '}
          <Link to="/login" style={{ color: COLORS.BORDEAUX, fontWeight: 700, textDecoration: 'none' }}>
            {t('signIn')}
          </Link>
        </div>
      </div>
      </div>
    </div>
  );
}
