import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, user, loading: authLoading } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, authLoading, navigate]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch {
      setError('Não foi possível entrar. Verifique email e senha.');
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
    <AuthLayout
      title="Entrar"
      subtitle="Acesse sua conta para gerenciar anúncios e peças."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-[#6A5F58] mb-1">Email</label>
          <input
            type="email"
            className="w-full rounded-xl border border-[#D8CFC2] px-4 py-3 text-sm text-[#2C1A17] bg-[#FAF6EF] outline-none focus:border-[#6B1E2D] transition"
            placeholder="seuemail@exemplo.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#6A5F58] mb-1">Senha</label>
          <input
            type="password"
            className="w-full rounded-xl border border-[#D8CFC2] px-4 py-3 text-sm text-[#2C1A17] bg-[#FAF6EF] outline-none focus:border-[#6B1E2D] transition"
            placeholder="Digite sua senha"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[#6B1E2D] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#541723] disabled:opacity-60"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <div className="mt-6 flex justify-between text-sm">
        <Link to="/cadastro" className="text-[#6B1E2D] font-medium hover:underline no-underline">
          Criar conta
        </Link>
        <Link to="/recuperar-senha" className="text-[#6A5F58] hover:text-[#6B1E2D] no-underline">
          Esqueci minha senha
        </Link>
      </div>
    </AuthLayout>
  );
}
