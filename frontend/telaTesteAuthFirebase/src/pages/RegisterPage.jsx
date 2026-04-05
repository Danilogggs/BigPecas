import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { cadastrarUsuario } from '../services/usuarioService';

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-[#6A5F58] mb-1">
        {label}
        {required && <span className="text-[#6B1E2D] ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  'w-full rounded-xl border border-[#D8CFC2] px-4 py-3 text-sm text-[#2C1A17] bg-[#FAF6EF] outline-none focus:border-[#6B1E2D] transition';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, user, loading: authLoading } = useAuth();
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

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, authLoading, navigate]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleCepChange(e) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
    const formatted = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
    setForm((prev) => ({ ...prev, cep: formatted }));
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
      await register(form.email, form.password);

      try {
        await cadastrarUsuario({
          full_name: form.full_name,
          email: form.email,
          password: form.password,
          ...(form.gender && { gender: form.gender }),
          ...(form.cep && { cep: form.cep }),
        });
      } catch (mysqlErr) {
        console.error('Perfil não salvo no banco:', mysqlErr.message);
        setMessage({
          type: 'success',
          text: 'Conta criada! Não foi possível salvar todos os dados do perfil, mas você já pode fazer login.',
        });
        setTimeout(() => navigate('/dashboard'), 2500);
        return;
      }

      setMessage({ type: 'success', text: 'Cadastro realizado com sucesso! Redirecionando...' });
      setTimeout(() => navigate('/dashboard'), 1800);
    } catch (firebaseErr) {
      const mensagens = {
        'auth/email-already-in-use': 'Este e-mail já está cadastrado.',
        'auth/invalid-email': 'E-mail inválido.',
        'auth/weak-password': 'Senha fraca. Use pelo menos 8 caracteres.',
      };
      setMessage({
        type: 'error',
        text: mensagens[firebaseErr.code] || 'Erro ao criar conta. Tente novamente.',
      });
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FAF6EF] flex items-center justify-center">
        <p className="text-[#6A5F58] text-sm">Verificando autenticação...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF6EF] flex flex-col">
      <header className="bg-[#6B1E2D] px-6 py-4">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs uppercase tracking-[0.35em] text-[#C2A878] m-0">Retro Garage</p>
          <Link to="/" className="no-underline">
            <span className="font-serif text-2xl font-bold text-[#F4E9D8]">BigPeças</span>
          </Link>
        </div>
      </header>

      <div className="bg-[#F4E9D8] border-b border-[#C2A878]/30 px-6 py-4">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-serif text-xl font-bold text-[#2C1A17] m-0">Criar conta</h2>
          <p className="text-sm text-[#6A5F58] mt-1 mb-0">
            Preencha os dados abaixo para se cadastrar na plataforma.
          </p>
        </div>
      </div>

      <main className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-3xl">
          {message.text && (
            <div
              className={`rounded-xl px-4 py-3 text-sm font-medium mb-6 ${
                message.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="bg-white rounded-[28px] border border-[#D8CFC2] shadow-sm p-8">
            <form onSubmit={handleSubmit} noValidate className="space-y-8">
              {/* Dados Pessoais */}
              <section>
                <h3 className="font-serif text-lg font-semibold text-[#6B1E2D] border-b border-[#D8CFC2] pb-2 mb-5">
                  Dados Pessoais
                </h3>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Field label="Nome completo" required>
                      <input
                        className={inputClass}
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
                  <Field label="Gênero">
                    <select
                      className={inputClass}
                      name="gender"
                      value={form.gender}
                      onChange={handleChange}
                    >
                      <option value="">Prefiro não informar</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Feminino">Feminino</option>
                      <option value="Não-binário">Não-binário</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </Field>
                  <Field label="CEP">
                    <input
                      className={inputClass}
                      type="text"
                      name="cep"
                      placeholder="00000-000"
                      value={form.cep}
                      onChange={handleCepChange}
                      maxLength={9}
                    />
                  </Field>
                </div>
              </section>

              {/* Dados de Acesso */}
              <section>
                <h3 className="font-serif text-lg font-semibold text-[#6B1E2D] border-b border-[#D8CFC2] pb-2 mb-5">
                  Dados de Acesso
                </h3>
                <div className="grid gap-5">
                  <Field label="Email" required>
                    <input
                      className={inputClass}
                      type="email"
                      name="email"
                      placeholder="seuemail@exemplo.com"
                      value={form.email}
                      onChange={handleChange}
                      required
                    />
                  </Field>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Senha" required>
                      <input
                        className={inputClass}
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
                      <input
                        className={inputClass}
                        type="password"
                        name="confirmPassword"
                        placeholder="Repita a senha"
                        value={form.confirmPassword}
                        onChange={handleChange}
                        required
                      />
                    </Field>
                  </div>
                </div>
              </section>

              {/* Actions */}
              <div className="flex items-center justify-between flex-wrap gap-4 pt-2">
                <Link to="/login" className="text-sm text-[#6A5F58] hover:text-[#6B1E2D] no-underline">
                  Já tenho conta → Entrar
                </Link>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        full_name: '',
                        email: '',
                        password: '',
                        confirmPassword: '',
                        gender: '',
                        cep: '',
                      })
                    }
                    className="rounded-xl border border-[#6B1E2D] px-5 py-2.5 text-sm font-medium text-[#6B1E2D] transition hover:bg-[#6B1E2D]/10"
                  >
                    Limpar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-xl bg-[#6B1E2D] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#541723] disabled:opacity-60"
                  >
                    {loading ? 'Cadastrando...' : 'Cadastrar'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
