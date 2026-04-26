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

export default function CadastroUsuario() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const precisaDadosLoja = form.tipo_usuario === 'vendedor' || form.tipo_usuario === 'ambos';

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleGenderSelect(value) {
    setForm((prev) => ({ ...prev, gender: value }));
  }

  function handleTipoUsuarioChange(tipo) {
    setForm((prev) => ({
      ...prev,
      tipo_usuario: tipo,
      nome_loja: tipo === 'comprador' ? '' : prev.nome_loja,
      descricao_loja: tipo === 'comprador' ? '' : prev.descricao_loja,
    }));
  }

  function formatCep(value) {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    if (digits.length > 5) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
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
    setForm((prev) => ({ ...prev, cep: formatCep(e.target.value) }));
  }

  function handleTelefoneChange(e) {
    setForm((prev) => ({ ...prev, telefone: formatTelefone(e.target.value) }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!form.full_name.trim()) {
      setMessage({ type: 'error', text: 'Informe seu nome completo.' });
      return;
    }

    if (!form.tipo_usuario.trim()) {
      setMessage({ type: 'error', text: 'Selecione o tipo de usuário.' });
      return;
    }

    if (precisaDadosLoja && !form.nome_loja.trim()) {
      setMessage({ type: 'error', text: 'Informe o nome da loja.' });
      return;
    }

    if (precisaDadosLoja && !form.descricao_loja.trim()) {
      setMessage({ type: 'error', text: 'Informe a descrição da loja.' });
      return;
    }

    if (!form.email.trim()) {
      setMessage({ type: 'error', text: 'Informe seu email.' });
      return;
    }

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

      setMessage({ type: 'success', text: 'Conta criada com sucesso.' });
      setTimeout(() => navigate('/login'), 2000);
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
          maxWidth: '760px',
          backgroundColor: '#fff',
          borderRadius: BORDER_RADIUS.LG,
          border: `1px solid ${COLORS.BORDEAUX}14`,
          padding: '32px',
          boxShadow: '0 16px 42px rgba(0, 0, 0, 0.07)',
          maxHeight: '92vh',
          overflowY: 'auto',
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
            Criar conta
          </h1>
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

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: SPACING.SM,
              }}
            >
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
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = `0 6px 14px ${COLORS.BORDEAUX}14`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = selected
                        ? `0 4px 10px ${COLORS.BORDEAUX}14`
                        : 'none';
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ ...GRID_TWO_COLUMNS, marginBottom: SPACING.LG }}>
            <Field label="Telefone">
              <Input
                type="text"
                name="telefone"
                placeholder="(00) 00000-0000"
                value={form.telefone}
                onChange={handleTelefoneChange}
                maxLength={15}
              />
            </Field>

            <Field label="CEP">
              <Input
                type="text"
                name="cep"
                placeholder="00000-000"
                value={form.cep}
                onChange={handleCepChange}
                maxLength={9}
              />
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
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = `0 8px 18px ${COLORS.BORDEAUX}22`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = selected
                        ? `0 8px 18px ${COLORS.BORDEAUX}18`
                        : '0 3px 10px rgba(0, 0, 0, 0.04)';
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
            </Field>
          </div>

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
  );
}