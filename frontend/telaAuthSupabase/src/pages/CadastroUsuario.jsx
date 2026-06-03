import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Field, Input, ButtonPrimary, AlertError, AlertSuccess } from '../components/StyledComponents';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, FLEX_CENTER, GRID_TWO_COLUMNS } from '../styles/theme';
import { mapSupabaseAuthError } from '../utils/friendlyErrors';

const INITIAL_FORM = {
  full_name: '',
  email: '',
  password: '',
  confirmPassword: '',
  gender: '',
  cep: '',
  tipo_usuario: '',
  nome_loja: '',
  descricao_loja: '',
  telefone: '',
};

const USER_TYPES = [
  {
    value: 'comprador',
    title: 'Comprador',
    description: 'Quero comprar peças no marketplace.',
  },
  {
    value: 'vendedor',
    title: 'Vendedor',
    description: 'Quero cadastrar minha loja e vender peças.',
  },
  {
    value: 'ambos',
    title: 'Comprador e vendedor',
    description: 'Quero comprar e também vender peças.',
  },
];

const GENDER_OPTIONS = [
  { value: '', label: 'Prefiro não informar' },
  { value: 'Masculino', label: 'Masculino' },
  { value: 'Feminino', label: 'Feminino' },
  { value: 'Não-binário', label: 'Não-binário' },
  { value: 'Outro', label: 'Outro' },
];

const REGEX = {
  nome: /^[A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)+$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  senha: /^(?=.*[A-Za-z])(?=.*\d).{8,}$/,
  cep: /^\d{5}-\d{3}$/,
  telefone: /^\(\d{2}\)\s\d{4,5}-\d{4}$/,
  loja: /^[A-Za-zÀ-ÿ0-9\s.'-]{3,150}$/,
};

export default function CadastroUsuario() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [errors, setErrors] = useState({});

  const precisaDadosLoja = form.tipo_usuario === 'vendedor' || form.tipo_usuario === 'ambos';

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

  function handleTipoUsuarioChange(tipo) {
    setForm((prev) => ({
      ...prev,
      tipo_usuario: tipo,
      nome_loja: tipo === 'comprador' ? '' : prev.nome_loja,
      descricao_loja: tipo === 'comprador' ? '' : prev.descricao_loja,
    }));

    clearFieldError('tipo_usuario');
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

    if (!form.tipo_usuario.trim()) {
      newErrors.tipo_usuario = 'Selecione o tipo de usuário.';
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

    if (precisaDadosLoja && !form.nome_loja.trim()) {
      newErrors.nome_loja = 'Informe o nome da loja.';
    } else if (precisaDadosLoja && !REGEX.loja.test(form.nome_loja.trim())) {
      newErrors.nome_loja = 'O nome da loja deve ter pelo menos 3 caracteres válidos.';
    }

    if (precisaDadosLoja && !form.descricao_loja.trim()) {
      newErrors.descricao_loja = 'Informe a descrição da loja.';
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
        tipo_usuario: form.tipo_usuario.trim(),
        nome_loja: precisaDadosLoja ? form.nome_loja.trim() : '',
        descricao_loja: precisaDadosLoja ? form.descricao_loja.trim() : '',
        telefone: form.telefone.trim(),
      });

      setMessage({ type: 'success', text: 'Conta criada. Verifique seu email para ativar o acesso.' });
      setTimeout(() => navigate('/login'), 3500);
    } catch (error) {
      setMessage({ type: 'error', text: mapSupabaseAuthError(error, 'register') });
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
      {/* Painel esquerdo */}
      <div className="auth-panel-left">
        <div className="auth-panel-left__glow" />
        <div className="auth-panel-left__content">
          <div className="auth-panel-left__logo">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--bp-gold)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L3 6v6c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V6L12 2Z" />
              <path d="M9 12l2 2 4-4" strokeWidth="2" />
            </svg>
            <span className="auth-panel-left__logo-text">
              <span style={{ color: '#fff' }}>Big</span>
              <span style={{ color: 'var(--bp-gold)' }}>Peças</span>
            </span>
          </div>
          <h1 className="auth-panel-left__heading">
            Faça parte da<br />comunidade clássica.
          </h1>
          <p className="auth-panel-left__sub">
            Anuncie peças com selo de verificação, acompanhe pedidos e acesse
            curadoria por marca, década e condição.
          </p>
          <div className="auth-panel-left__features">
            {['Anuncie com procedência verificada', 'Acompanhe pedidos e simulações', 'Curadoria por marca, década e condição'].map((t) => (
              <div key={t} className="auth-panel-left__feature">
                <span className="auth-panel-left__feature-icon">✓</span>{t}
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
          backgroundColor: '#fff',
          borderRadius: 'var(--r-2xl)',
          border: '1px solid var(--bp-border-light)',
          padding: '2.5rem',
          boxShadow: 'var(--shadow-md)',
          margin: 'auto',
        }}
      >
        <div style={{ marginBottom: '1.75rem' }}>
          <p className="auth-form-tag">NOVA CONTA</p>
          <h2 className="auth-form-title" style={{ marginBottom: 0 }}>Criar sua conta</h2>
        </div>

        {message.text && (
          message.type === 'success' ? (
            <AlertSuccess>
              <div>{message.text}</div>
              <div style={{ fontSize: '0.85rem', marginTop: SPACING.SM, opacity: 0.8 }}>
                Redirecionando para o login...
              </div>
            </AlertSuccess>
          ) : (
            <AlertError>{message.text}</AlertError>
          )
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: SPACING.LG }}>
            <Field label="Nome completo" required>
              <Input
                type="text"
                name="full_name"
                placeholder="Ex: Maria Aparecida Silva"
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
              Gênero
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: SPACING.SM }}>
              {GENDER_OPTIONS.map((option) => {
                const selected = form.gender === option.value;

                return (
                  <button
                    key={option.label}
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
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ ...GRID_TWO_COLUMNS, marginBottom: SPACING.LG }}>
            <Field label="Telefone" required>
              <Input
                type="text"
                name="telefone"
                placeholder="(00) 00000-0000"
                value={form.telefone}
                onChange={handleTelefoneChange}
                maxLength={15}
                required
              />
              {errors.telefone && <div style={fieldErrorStyle}>{errors.telefone}</div>}
            </Field>

            <Field label="CEP" required>
              <Input
                type="text"
                name="cep"
                placeholder="00000-000"
                value={form.cep}
                onChange={handleCepChange}
                maxLength={9}
                required
              />
              {errors.cep && <div style={fieldErrorStyle}>{errors.cep}</div>}
            </Field>
          </div>

          <hr style={dividerStyle} />

          <div style={{ marginBottom: SPACING.MD }}>
            <div
              style={{
                fontSize: '0.95rem',
                fontWeight: 700,
                color: COLORS.DARK_TEXT,
                marginBottom: SPACING.SM,
              }}
            >
              Tipo de usuário <span style={{ color: COLORS.BORDEAUX }}>*</span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                gap: SPACING.MD,
              }}
            >
              {USER_TYPES.map((type) => {
                const selected = form.tipo_usuario === type.value;

                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => handleTipoUsuarioChange(type.value)}
                    style={{
                      textAlign: 'left',
                      padding: SPACING.LG,
                      borderRadius: BORDER_RADIUS.MD,
                      border: selected ? `2px solid ${COLORS.BORDEAUX}` : `1px solid ${COLORS.BORDEAUX}22`,
                      backgroundColor: selected ? `${COLORS.BORDEAUX}10` : '#fff',
                      color: COLORS.DARK_TEXT,
                      cursor: 'pointer',
                      boxShadow: selected ? `0 8px 18px ${COLORS.BORDEAUX}18` : '0 3px 10px rgba(0, 0, 0, 0.04)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.SM, marginBottom: SPACING.SM }}>
                      <span
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          border: selected ? `5px solid ${COLORS.BORDEAUX}` : `2px solid ${COLORS.BORDEAUX}55`,
                          backgroundColor: '#fff',
                          transition: 'all 0.2s ease',
                        }}
                      />
                      <strong style={{ fontSize: '0.95rem' }}>{type.title}</strong>
                    </div>

                    <p style={{ margin: 0, fontSize: '0.82rem', color: COLORS.MUTED_TEXT, lineHeight: 1.4 }}>
                      {type.description}
                    </p>
                  </button>
                );
              })}
            </div>

            {errors.tipo_usuario && <div style={fieldErrorStyle}>{errors.tipo_usuario}</div>}
          </div>

          {precisaDadosLoja && (
            <>
              <hr style={dividerStyle} />

              <div style={{ marginBottom: SPACING.LG }}>
                <Field label="Nome da loja" required>
                  <Input
                    type="text"
                    name="nome_loja"
                    placeholder="Ex: Auto Peças Garabetti"
                    value={form.nome_loja}
                    onChange={handleChange}
                    maxLength={150}
                    required={precisaDadosLoja}
                  />
                  {errors.nome_loja && <div style={fieldErrorStyle}>{errors.nome_loja}</div>}
                </Field>
              </div>

              <div style={{ marginBottom: SPACING.LG }}>
                <Field label="Descrição da loja" required>
                  <Input
                    type="text"
                    name="descricao_loja"
                    placeholder="Ex: Loja especializada em peças antigas e difíceis de encontrar"
                    value={form.descricao_loja}
                    onChange={handleChange}
                    maxLength={500}
                    required={precisaDadosLoja}
                  />
                  {errors.descricao_loja && <div style={fieldErrorStyle}>{errors.descricao_loja}</div>}
                </Field>
              </div>
            </>
          )}

          <hr style={dividerStyle} />

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

          <div style={{ ...GRID_TWO_COLUMNS, marginBottom: SPACING.XL }}>
            <Field label="Senha" required>
              <Input
                type="password"
                name="password"
                placeholder="Mínimo de 8 caracteres"
                value={form.password}
                onChange={handleChange}
                required
              />
              {errors.password && <div style={fieldErrorStyle}>{errors.password}</div>}
            </Field>

            <Field label="Confirmar senha" required>
              <Input
                type="password"
                name="confirmPassword"
                placeholder="Digite a senha novamente"
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
            {loading ? 'Criando conta...' : 'Criar conta'}
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
          Já possui conta?{' '}
          <Link to="/login" style={{ color: COLORS.BORDEAUX, fontWeight: 700, textDecoration: 'none' }}>
            Entrar
          </Link>
        </div>
      </div>
      </div>
    </div>
  );
}