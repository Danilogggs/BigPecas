import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout, getToken } = useAuth();
  const [apiResponse, setApiResponse] = useState(null);
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProtectedData() {
      try {
        const token = await getToken();

        const response = await fetch(`${API_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Erro ao consultar API protegida.');
        }

        setApiResponse(data);
      } catch (error) {
        setApiError(error.message);
      } finally {
        setLoading(false);
      }
    }

    fetchProtectedData();
  }, [getToken]);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="container py-5">
      <div className="dashboard-card p-4 p-md-5">
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
          <div>
            <span className="brand-badge mb-3">Área protegida</span>
            <h1 className="h2 fw-bold mb-2">Bem-vindo ao BigPeças</h1>
            <p className="text-secondary mb-0">
              Usuário autenticado com Firebase e token validado no Node.
            </p>
          </div>

          <button className="btn btn-outline-light" onClick={handleLogout}>
            Sair
          </button>
        </div>

        <div className="info-box p-3 mb-4">
          <strong>Email autenticado:</strong>
          <div>{user?.email}</div>
          <strong className="d-block mt-3">UID:</strong>
          <div className="text-break">{user?.uid}</div>
        </div>

        <h2 className="h5 mb-3">Teste da API protegida</h2>

        {loading && <div className="alert alert-secondary">Consultando backend...</div>}
        {apiError && <div className="alert alert-danger">{apiError}</div>}
        {apiResponse && (
          <div className="alert alert-success mb-0">
            <div className="fw-semibold">{apiResponse.message}</div>
            <div className="mt-2">
              <strong>Email do token:</strong> {apiResponse.user.email}
            </div>
            <div>
              <strong>UID do token:</strong> {apiResponse.user.uid}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
