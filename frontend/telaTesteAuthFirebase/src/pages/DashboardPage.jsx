import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { menuItems } from '../data/mockData';
import PrivateRoute from '../routes/PrivateRoute';
import { parseErrorResponse, parseUnexpectedError } from '../utils/friendlyErrors';
import { buscarPerfilUsuario } from '../services/usuarioService';
import PageLayout from '../components/layouts/PageLayout';
import AppSidebar from '../components/AppSidebar';
import styles from './DashboardPage.module.css';

const AUTH_API_URL =
  import.meta.env.VITE_AUTH_API_URL || import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeNav, setActiveNav] = useState('Catálogo');
  const [apiStatus, setApiStatus] = useState({ loading: true, data: null, error: null });
  const [profileStatus, setProfileStatus] = useState({ loading: true, data: null, error: null });

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const token = await user.getIdToken();
        const response = await fetch(`${AUTH_API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setApiStatus({ loading: false, data, error: null });
        } else {
          const mensagem = await parseErrorResponse(response, 'Não foi possível validar sua sessão protegida agora.');
          setApiStatus({ loading: false, data: null, error: mensagem });
        }
      } catch (error) {
        setApiStatus({ loading: false, data: null, error: parseUnexpectedError(error, 'Não foi possível validar sua sessão protegida agora.') });
      }

      try {
        const profile = await buscarPerfilUsuario();
        setProfileStatus({ loading: false, data: profile, error: null });
      } catch (error) {
        setProfileStatus({ loading: false, data: null, error: parseUnexpectedError(error, 'Não foi possível carregar os dados do seu perfil agora.') });
      }
    };

    if (user) loadUserData();
  }, [user]);

  return (
    <PrivateRoute>
      <PageLayout>
        <div className={styles.body}>
          <AppSidebar
            menuItems={menuItems}
            activeNav={activeNav}
            onNavChange={setActiveNav}
            infoTitle="Visão Geral"
            infoText="Acompanhe suas operações em tempo real."
            onInfoAction={() => navigate('/')}
          />

          <main className={styles.main}>
            <h1 className={styles.pageTitle}>Dashboard</h1>
            <p className={styles.pageSubtitle}>Bem-vindo ao painel de controle</p>

            {/* Card: Informações de Usuário */}
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Informações de Usuário</h2>
              {profileStatus.loading ? (
                <p style={{ color: 'var(--muted-text)' }}>Carregando dados do perfil...</p>
              ) : profileStatus.error ? (
                <div className={styles.alertError}>{profileStatus.error}</div>
              ) : (
                <div className={styles.profileGrid}>
                  {[
                    ['Nome', profileStatus.data?.nome],
                    ['Email', profileStatus.data?.email || user?.email],
                    ['Gênero', profileStatus.data?.genero],
                    ['CEP', profileStatus.data?.cep],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className={styles.profileLabel}>{label}</p>
                      <p className={styles.profileValue}>{value || 'Não informado'}</p>
                    </div>
                  ))}
                  <div className={styles.profileColFull}>
                    <p className={styles.profileLabel}>UID do Firebase</p>
                    <p className={`${styles.profileValue} ${styles.profileValueBreak}`}>
                      {profileStatus.data?.uid || user?.uid || 'Não disponível'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Card: Teste de Acesso */}
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Teste de Acesso Protegido</h2>
              {apiStatus.loading ? (
                <p style={{ color: 'var(--muted-text)' }}>Testando acesso à rota protegida...</p>
              ) : apiStatus.error ? (
                <div className={styles.alertError}>{apiStatus.error}</div>
              ) : apiStatus.data ? (
                <div className={styles.alertSuccess}>
                  Acesso autorizado. Dados recebidos: {JSON.stringify(apiStatus.data)}
                </div>
              ) : null}
            </div>

            {/* Card: Ações Rápidas */}
            <div className={styles.card} style={{ marginBottom: 0 }}>
              <h2 className={styles.cardTitle}>Ações Rápidas</h2>
              <div className={styles.actionsGrid}>
                <button className={styles.btnPrimary} onClick={() => navigate('/cadastroPecas')}>
                  + Cadastrar Peça
                </button>
                <button className={styles.btnGold} onClick={() => navigate('/buscaPecas')}>
                  Ver Catálogo
                </button>
              </div>
            </div>
          </main>
        </div>
      </PageLayout>
    </PrivateRoute>
  );
}
