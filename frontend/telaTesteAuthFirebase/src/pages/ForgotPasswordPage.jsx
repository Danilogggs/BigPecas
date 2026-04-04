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
      setSuccess('Email de redefinição enviado com sucesso.');
    } catch (err) {
      setError('Não foi possível enviar o email de redefinição.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Recuperar senha"
      subtitle="Informe seu email para receber o link de redefinição."
    >
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Email</label>
          <input
            type="email"
            className="form-control"
            placeholder="seuemail@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        {error && <div className="alert alert-danger py-2">{error}</div>}
        {success && <div className="alert alert-success py-2">{success}</div>}

        <button className="btn btn-success w-100 py-2 mt-2" disabled={loading}>
          {loading ? 'Enviando...' : 'Enviar email'}
        </button>
      </form>

      <div className="mt-4">
        <Link to="/login" className="link-light-muted">
          Voltar para o login
        </Link>
      </div>
    </AuthLayout>
  );
}
