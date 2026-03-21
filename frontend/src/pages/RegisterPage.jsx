import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { useAuth } from '../contexts/AuthContext';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (form.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);

    try {
      await register(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      console.error('Erro Firebase:', err);
      setError(`Erro: ${err.code} - ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Criar conta"
      subtitle="Cadastre-se para começar a usar o BigPeças."
    >
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Email</label>
          <input
            type="email"
            className="form-control"
            placeholder="seuemail@exemplo.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Senha</label>
          <input
            type="password"
            className="form-control"
            placeholder="Crie uma senha"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Confirmar senha</label>
          <input
            type="password"
            className="form-control"
            placeholder="Repita a senha"
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            required
          />
        </div>

        {error && <div className="alert alert-danger py-2">{error}</div>}

        <button className="btn btn-success w-100 py-2 mt-2" disabled={loading}>
          {loading ? 'Criando conta...' : 'Cadastrar'}
        </button>
      </form>

      <div className="mt-4">
        <Link to="/login" className="link-light-muted">
          Já tenho conta
        </Link>
      </div>
    </AuthLayout>
  );
}
