import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError('Não foi possível entrar. Verifique email e senha.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Entrar"
      subtitle="Acesse sua conta para gerenciar anúncios, peças e pedidos."
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
            placeholder="Digite sua senha"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </div>

        {error && <div className="alert alert-danger py-2">{error}</div>}

        <button className="btn btn-success w-100 py-2 mt-2" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <div className="d-flex justify-content-between mt-4 flex-wrap gap-2">
        <Link to="/cadastro-usuario" className="link-light-muted">
          Criar conta
        </Link>
        <Link to="/recuperar-senha" className="link-light-muted">
          Esqueci minha senha
        </Link>
      </div>
    </AuthLayout>
  );
}
