import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cadastrarUsuario } from '../services/usuarioService';
import { useAuth } from '../contexts/AuthContext';
import { Field, Input, Select, ButtonPrimary, ButtonSecondary, AlertError, AlertSuccess } from '../components/StyledComponents';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDER_RADIUS, FLEX_CENTER, GRID_TWO_COLUMNS } from '../styles/theme';
import { mapFirebaseAuthError } from '../utils/friendlyErrors';

export default function CadastroUsuario() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    gender: '',
    cep: '',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function formatCep(value) {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    if (digits.length > 5) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    return digits;
  }

  function handleCepChange(e) {
    setForm((prev) => ({ ...prev, cep: formatCep(e.target.value) }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!form.full_name.trim()) {
      setMessage({ type: 'error', text: 'Informe seu nome completo.' });
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
      await register(form.email.trim(), form.password);

      await cadastrarUsuario({
        nome: form.full_name.trim(),
        email: form.email.trim(),
        genero: form.gender?.trim() || '',
        cep: form.cep?.trim() || '',
      });

      setMessage({ type: 'success', text: 'Conta criada com sucesso.' });
      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      setMessage({ type: 'error', text: mapFirebaseAuthError(error, 'register') });
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setForm({ full_name: '', email: '', password: '', confirmPassword: '', gender: '', cep: '' });
    setMessage({ type: '', text: '' });
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
          maxWidth: '600px',
          backgroundColor: '#fff',
          borderRadius: BORDER_RADIUS.LG,
          border: `2px solid ${COLORS.BORDEAUX}22`,
          padding: SPACING.XL,
          boxShadow: SHADOWS.SM,
          maxHeight: '90vh',
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
          <p style={{ margin: 0, marginTop: SPACING.SM, fontSize: '0.95rem', color: COLORS.MUTED_TEXT }}>
            Preencha seus dados para criar uma nova conta.
          </p>
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

          <div style={{ ...GRID_TWO_COLUMNS, marginBottom: SPACING.LG }}>
            <Field label="Gênero">
              <Select name="gender" value={form.gender} onChange={handleChange}>
                <option value="">Prefiro não informar</option>
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
                <option value="Não-binário">Não-binário</option>
                <option value="Outro">Outro</option>
              </Select>
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

          <div style={{ display: 'flex', gap: SPACING.MD, flexWrap: 'wrap' }}>
            <ButtonPrimary type="submit" disabled={loading}>
              {loading ? 'Criando conta...' : 'Criar conta'}
            </ButtonPrimary>
            <ButtonSecondary type="button" onClick={handleReset} disabled={loading}>
              Limpar
            </ButtonSecondary>
          </div>
        </form>

        <div style={{ marginTop: SPACING.XL, fontSize: '0.92rem', color: COLORS.MUTED_TEXT }}>
          Já possui conta?{' '}
          <Link to="/login" style={{ color: COLORS.BORDEAUX, fontWeight: 700 }}>
            Entrar
          </Link>
        </div>
      </div>
    </div>
  );
}
