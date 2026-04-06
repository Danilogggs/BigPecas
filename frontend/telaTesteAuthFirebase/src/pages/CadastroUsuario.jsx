import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cadastrarUsuario } from '../services/usuarioService';
import { useAuth } from '../contexts/AuthContext';
import { Field, Input, Select, ButtonPrimary, ButtonSecondary, AlertError, AlertSuccess } from '../components/StyledComponents';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDER_RADIUS, FLEX_CENTER, GRID_TWO_COLUMNS, GRID_ONE_COLUMN } from '../styles/theme';

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
      // 1. Cria o usuário no Firebase Auth
      await register(form.email, form.password);

      // 2. Salva o perfil completo no MySQL via user-service
      try {
        await cadastrarUsuario({
          full_name: form.full_name,
          email: form.email,
          password: form.password,
          ...(form.gender && { gender: form.gender }),
          ...(form.cep && { cep: form.cep }),
        });
      } catch (mysqlErr) {
        // Firebase OK, MySQL falhou — usuário pode logar, mas perfil não foi salvo
        console.error('Perfil não salvo no banco:', mysqlErr.message);
        setMessage({
          type: 'success',
          text: 'Conta criada! Não foi possível salvar todos os dados do perfil, mas você já pode fazer login.',
        });
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      setMessage({ type: 'success', text: 'Cadastro realizado com sucesso!' });
      setTimeout(() => navigate('/login'), 2000);
    } catch (firebaseErr) {
      const mensagens = {
        'auth/email-already-in-use': 'Este e-mail já está cadastrado.',
        'auth/invalid-email': 'E-mail inválido.',
        'auth/weak-password': 'Senha fraca. Use pelo menos 8 caracteres.',
      };
      setMessage({ type: 'error', text: mensagens[firebaseErr.code] || 'Erro ao criar conta. Tente novamente.' });
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setForm({ full_name: '', email: '', password: '', confirmPassword: '', gender: '', cep: '' });
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

        {/* Alert */}
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
          {/* Dados Pessoais */}
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

          {/* Dados de Acesso */}
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
                placeholder="Mínimo 8 caracteres"
                value={form.password}
                onChange={handleChange}
                minLength={8}
                required
              />
            </Field>

            <Field label="Confirmar senha" required>
              <Input
                type="password"
                name="confirmPassword"
                placeholder="Repita a senha"
                value={form.confirmPassword}
                onChange={handleChange}
                required
              />
            </Field>
          </div>

          {/* Botões */}
          <div style={{ display: 'flex', gap: SPACING.MD, justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
            <Link to="/login" style={{ fontSize: '0.875rem', color: COLORS.MUTED_TEXT, textDecoration: 'none' }}>
              Já tenho conta
            </Link>

            <ButtonSecondary onClick={handleReset}>
              Limpar
            </ButtonSecondary>

            <ButtonPrimary type="submit" disabled={loading}>
              {loading ? 'Cadastrando...' : '✓ Cadastrar'}
            </ButtonPrimary>
          </div>
        </form>
      </div>
    </div>
  );
}
