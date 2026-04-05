import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { useAuth } from '../contexts/AuthContext';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await resetPassword(email);
      setSuccess('Email de redefinição enviado. Verifique sua caixa de entrada.');
    } catch {
      setError('Não foi possível enviar o email. Verifique o endereço informado.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Recuperar senha"
      subtitle="Informe seu email para receber o link de redefinição."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-[#6A5F58] mb-1">Email</label>
          <input
            type="email"
            className="w-full rounded-xl border border-[#D8CFC2] px-4 py-3 text-sm text-[#2C1A17] bg-[#FAF6EF] outline-none focus:border-[#6B1E2D] transition"
            placeholder="seuemail@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[#6B1E2D] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#541723] disabled:opacity-60"
        >
          {loading ? 'Enviando...' : 'Enviar email de recuperação'}
        </button>
      </form>

      <div className="mt-6">
        <Link to="/login" className="text-sm text-[#6A5F58] hover:text-[#6B1E2D] no-underline">
          ← Voltar para o login
        </Link>
      </div>
    </AuthLayout>
  );
}
