import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Field, Input, Select, ButtonPrimary, ButtonSecondary, AlertError, AlertSuccess } from '../components/StyledComponents';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDER_RADIUS, FLEX_CENTER, GRID_TWO_COLUMNS } from '../styles/theme';
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

export default function CadastroUsuario() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState(INITIAL_FORM);
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
        nome_loja: form.nome_loja.trim(),
        descricao_loja: form.descricao_loja.trim(),
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

  function handleReset() {
    setForm(INITIAL_FORM);
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
          maxWidth: '720px',
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
            Preencha seus dados para criar uma nova conta com autenticação pelo Supabase.
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

            <Field label="Tipo de usuário">
              <Select name="tipo_usuario" value={form.tipo_usuario} onChange={handleChange}>
                <option value="">Selecione</option>
                <option value="comprador">Comprador</option>
                <option value="vendedor">Vendedor</option>
                <option value="ambos">Comprador e vendedor</option>
              </Select>
            </Field>
          </div>

          <div style={{ ...GRID_TWO_COLUMNS, marginBottom: SPACING.LG }}>
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
          </div>

          <div style={{ marginBottom: SPACING.LG }}>
            <Field label="Nome da loja">
              <Input
                type="text"
                name="nome_loja"
                placeholder="Preencha se for vender peças"
                value={form.nome_loja}
                onChange={handleChange}
                maxLength={150}
              />
            </Field>
          </div>

          <div style={{ marginBottom: SPACING.LG }}>
            <Field label="Descrição da loja">
              <Input
                type="text"
                name="descricao_loja"
                placeholder="Ex: Loja especializada em peças antigas"
                value={form.descricao_loja}
                onChange={handleChange}
                maxLength={500}
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
