import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DashboardNav from '../components/DashboardNav';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, getToken } = useAuth();
  const [apiStatus, setApiStatus] = useState({ loading: true, ok: false, data: null, error: '' });

  useEffect(() => {
    async function checkApi() {
      try {
        const token = await getToken();
        const response = await fetch(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Erro na API.');
        setApiStatus({ loading: false, ok: true, data, error: '' });
      } catch (err) {
        setApiStatus({ loading: false, ok: false, data: null, error: err.message });
      }
    }
    checkApi();
  }, [getToken]);

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'usuário';

  return (
    <div className="min-h-screen bg-[#FAF6EF]">
      <DashboardNav />

      <main className="mx-auto max-w-7xl px-6 py-10">
        {/* Welcome */}
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.25em] text-[#7C6540]">Bem-vindo de volta</p>
          <h1 className="font-serif text-3xl font-bold text-[#2C1A17] mt-1">
            Olá, {displayName}
          </h1>
          <p className="text-[#6A5F58] mt-1 text-sm">
            Gerencie seu catálogo, peças e conta pela área abaixo.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* User info card */}
          <div className="lg:col-span-2 rounded-[24px] border border-[#D8CFC2] bg-white p-6 shadow-sm">
            <h2 className="font-serif text-lg font-semibold text-[#2C1A17] mb-4">
              Informações da conta
            </h2>

            <div className="space-y-3">
              <div className="rounded-xl bg-[#FAF6EF] border border-[#D8CFC2] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-[#7C6540]">Email</p>
                <p className="text-sm font-medium text-[#2C1A17] mt-1">{user?.email}</p>
              </div>
              <div className="rounded-xl bg-[#FAF6EF] border border-[#D8CFC2] px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-[#7C6540]">UID Firebase</p>
                <p className="text-sm font-mono text-[#6A5F58] mt-1 break-all">{user?.uid}</p>
              </div>
            </div>

            {/* API status */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-[#6A5F58] uppercase tracking-[0.2em] mb-3">
                Status da API
              </h3>
              {apiStatus.loading && (
                <div className="rounded-xl bg-[#FAF6EF] border border-[#D8CFC2] px-4 py-3 text-sm text-[#6A5F58]">
                  Verificando conexão com o backend...
                </div>
              )}
              {!apiStatus.loading && apiStatus.ok && (
                <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
                  <p className="font-semibold">Backend conectado</p>
                  <p className="mt-1">{apiStatus.data?.message}</p>
                </div>
              )}
              {!apiStatus.loading && !apiStatus.ok && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  <p className="font-semibold">Backend indisponível</p>
                  <p className="mt-1">{apiStatus.error}</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="space-y-4">
            <div className="rounded-[24px] border border-[#D8CFC2] bg-white p-6 shadow-sm">
              <h2 className="font-serif text-lg font-semibold text-[#2C1A17] mb-4">
                Ações rápidas
              </h2>
              <div className="space-y-3">
                <Link
                  to="/cadastroPecas"
                  className="flex items-center justify-between w-full rounded-xl bg-[#6B1E2D] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#541723] no-underline"
                >
                  <span>Cadastrar peça</span>
                  <span>→</span>
                </Link>
                <Link
                  to="/"
                  className="flex items-center justify-between w-full rounded-xl border border-[#6B1E2D] px-4 py-3 text-sm font-medium text-[#6B1E2D] transition hover:bg-[#6B1E2D] hover:text-white no-underline"
                >
                  <span>Ver catálogo</span>
                  <span>→</span>
                </Link>
              </div>
            </div>

            <div className="rounded-[24px] border border-[#C2A878]/50 bg-[#F4E9D8] p-6">
              <p className="text-xs uppercase tracking-[0.25em] text-[#7C6540]">Dica</p>
              <p className="mt-2 text-sm text-[#6A5F58] leading-relaxed">
                Use o menu superior para navegar entre as seções do painel administrativo.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
