import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SearchIcon, UserIcon, ChevronDownIcon, WrenchIcon, BoltIcon, StarIcon } from '../components/Icons';
import { menuItems } from '../data/mockData';
import PrivateRoute from '../routes/PrivateRoute';
import { parseErrorResponse, parseUnexpectedError } from '../utils/friendlyErrors';
import { buscarPerfilUsuario } from '../services/usuarioService';

const BORDEAUX = '#7B1D2E';
const CREAM = '#F5EDD8';
const HIGHLIGHT = '#F0C060';
const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL || import.meta.env.VITE_API_URL || 'http://localhost:3001';

const SPACING = {
  XS: '0.25rem',
  SM: '0.5rem',
  MD: '1rem',
  LG: '1.5rem',
  XL: '2rem',
  XXL: '2.5rem',
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('Catálogo');
  const [searchQuery, setSearchQuery] = useState('');
  const [apiStatus, setApiStatus] = useState({ loading: true, data: null, error: null });
  const [profileStatus, setProfileStatus] = useState({ loading: true, data: null, error: null });
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
          const mensagem = await parseErrorResponse(
            response,
            'Não foi possível validar sua sessão protegida agora.'
          );
          setApiStatus({ loading: false, data: null, error: mensagem });
        }
      } catch (error) {
        setApiStatus({
          loading: false,
          data: null,
          error: parseUnexpectedError(error, 'Não foi possível validar sua sessão protegida agora.'),
        });
      }

      try {
        const profile = await buscarPerfilUsuario();
        setProfileStatus({ loading: false, data: profile, error: null });
      } catch (error) {
        setProfileStatus({
          loading: false,
          data: null,
          error: parseUnexpectedError(error, 'Não foi possível carregar os dados do seu perfil agora.'),
        });
      }
    };

    if (user) {
      loadUserData();
    }
  }, [user]);

  const iconMap = {
    wrench: <WrenchIcon size={16} />,
    bolt: <BoltIcon size={16} />,
    star: <StarIcon size={16} />,
  };

  return (
    <PrivateRoute>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* ── HEADER ── */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: `0 ${SPACING.LG}`,
            backgroundColor: BORDEAUX,
            minHeight: 64,
            flexShrink: 0,
            gap: SPACING.LG,
          }}
        >
          <div style={{ width: '20%', display: 'flex', alignItems: 'center', gap: SPACING.SM }}>
            <span
              style={{
                color: CREAM,
                fontFamily: "'Georgia', serif",
                fontSize: '1.55rem',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textShadow: '1px 1px 4px rgba(0,0,0,0.35)',
                whiteSpace: 'nowrap',
              }}
            >
              🔧 Big<span style={{ color: HIGHLIGHT }}>Peças</span>
            </span>
          </div>

          <div style={{ width: '25%' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                borderRadius: '9999px',
                backgroundColor: 'rgba(255,255,255,0.13)',
                border: '1.5px solid rgba(255,255,255,0.3)',
                overflow: 'hidden',
              }}
            >
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar peças, modelos..."
                style={{
                  flex: 1,
                  backgroundColor: 'transparent',
                  outline: 'none',
                  border: 'none',
                  padding: `${SPACING.SM} ${SPACING.MD}`,
                  fontSize: '0.875rem',
                  color: '#fff',
                }}
              />
              <button
                style={{
                  padding: `${SPACING.SM} ${SPACING.MD}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: HIGHLIGHT,
                  cursor: 'pointer',
                  opacity: 1,
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={(e) => (e.target.style.opacity = '0.8')}
                onMouseLeave={(e) => (e.target.style.opacity = '1')}
              >
                <SearchIcon size={17} />
              </button>
            </div>
          </div>

          <div style={{ flex: 1 }} />

          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: `${SPACING.SM} ${SPACING.MD}`,
                borderRadius: '9999px',
                backgroundColor: dropdownOpen ? 'rgba(255,255,255,0.15)' : 'transparent',
                border: 'none',
                color: CREAM,
                cursor: 'pointer',
                transition: 'all 0.25s',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = dropdownOpen
                  ? 'rgba(255,255,255,0.15)'
                  : 'transparent')
              }
            >
              <ChevronDownIcon
                size={17}
                color={HIGHLIGHT}
                style={{
                  transition: 'transform 0.25s',
                  transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              />
              <UserIcon size={26} />
            </button>

            {dropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  marginTop: SPACING.SM,
                  minWidth: 190,
                  backgroundColor: '#fff',
                  border: `1.5px solid ${BORDEAUX}22`,
                  borderRadius: '0.75rem',
                  overflow: 'hidden',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                  zIndex: 50,
                }}
              >
                <button
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: SPACING.MD,
                    padding: `${SPACING.MD} ${SPACING.LG}`,
                    fontSize: '0.875rem',
                    color: '#B91C1C',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: 'transparent',
                    textAlign: 'left',
                    fontWeight: 500,
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FFF5E8')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  onClick={() => {
                    logout();
                    navigate('/login');
                    setDropdownOpen(false);
                  }}
                >
                  Sair
                </button>
              </div>
            )}
          </div>
        </header>

        {/* ── BODY ── */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left sidebar */}
          <aside
            style={{
              width: '20%',
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              paddingTop: SPACING.LG,
              paddingBottom: SPACING.XXL,
              backgroundColor: BORDEAUX,
              overflowY: 'auto',
            }}
          >
            <p
              style={{
                paddingLeft: SPACING.LG,
                paddingRight: SPACING.LG,
                paddingBottom: SPACING.SM,
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.45)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              Menu
            </p>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', paddingLeft: SPACING.MD, paddingRight: SPACING.MD }}>
              {menuItems.map((item) => {
                const isActive = activeNav === item.label;
                return (
                  <button
                    key={item.label}
                    onClick={() => setActiveNav(item.label)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: SPACING.MD,
                      padding: `${SPACING.MD} ${SPACING.MD}`,
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      backgroundColor: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                      color: isActive ? HIGHLIGHT : CREAM,
                      fontWeight: isActive ? 600 : 400,
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      borderLeft: isActive ? `3px solid ${HIGHLIGHT}` : '3px solid transparent',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: SPACING.MD }}>
                      {iconMap[item.icon] || iconMap.wrench}
                      {item.label}
                    </span>
                    <span style={{ opacity: isActive ? 1 : 0.4 }}>›</span>
                  </button>
                );
              })}
            </nav>

            <div
              style={{
                marginLeft: SPACING.LG,
                marginRight: SPACING.LG,
                marginTop: SPACING.LG,
                marginBottom: SPACING.LG,
                borderTop: '1px solid rgba(255,255,255,0.12)',
              }}
            />

            <div
              style={{
                marginLeft: SPACING.MD,
                marginRight: SPACING.MD,
                borderRadius: '0.75rem',
                padding: SPACING.MD,
                backgroundColor: 'rgba(0,0,0,0.2)',
              }}
            >
              <p
                style={{
                  fontSize: '0.75rem',
                  marginBottom: '0.25rem',
                  color: HIGHLIGHT,
                  fontWeight: 700,
                }}
              >
                Visão Geral
              </p>
              <p
                style={{
                  fontSize: '0.75rem',
                  lineHeight: 1.5,
                  color: 'rgba(255,255,255,0.65)',
                }}
              >
                Acompanhe suas operações e dados do sistema em tempo real.
              </p>
              <button
                style={{
                  marginTop: SPACING.MD,
                  width: '100%',
                  padding: `0.375rem 0`,
                  borderRadius: '0.5rem',
                  fontSize: '0.75rem',
                  backgroundColor: HIGHLIGHT,
                  color: BORDEAUX,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                onClick={() => navigate('/')}
              >
                Home
              </button>
            </div>
          </aside>

          {/* Main content */}
          <main
            style={{
              flex: 1,
              overflowY: 'auto',
              backgroundColor: CREAM,
              padding: SPACING.XXL,
            }}
          >
            <h1 style={{ color: BORDEAUX, fontFamily: "'Georgia', serif", fontSize: '1.8rem', fontWeight: 700, marginBottom: SPACING.SM }}>
              Dashboard
            </h1>
            <p style={{ color: '#9B7B6A', marginBottom: SPACING.XXL }}>
              Bem-vindo ao painel de controle
            </p>

            {/* User Info Card */}
            <div
              style={{
                backgroundColor: '#fff',
                border: `1.5px solid ${BORDEAUX}22`,
                borderRadius: '0.75rem',
                padding: SPACING.LG,
                marginBottom: SPACING.XL,
              }}
            >
              <h2 style={{ color: BORDEAUX, fontWeight: 700, marginBottom: SPACING.MD, fontSize: '1.1rem' }}>
                Informações de Usuário
              </h2>
              {profileStatus.loading ? (
                <p style={{ color: '#9B7B6A' }}>Carregando dados do perfil...</p>
              ) : profileStatus.error ? (
                <div
                  style={{
                    backgroundColor: '#FEE2E2',
                    color: '#7F1D1D',
                    padding: SPACING.MD,
                    borderRadius: '0.5rem',
                    border: `2px solid #FCA5A5`,
                  }}
                >
                  {profileStatus.error}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACING.LG }}>
                  <div>
                    <p style={{ color: '#9B7B6A', marginBottom: SPACING.SM, fontSize: '0.85rem' }}>Nome</p>
                    <p style={{ color: BORDEAUX, fontWeight: 600 }}>{profileStatus.data?.nome || 'Não informado'}</p>
                  </div>
                  <div>
                    <p style={{ color: '#9B7B6A', marginBottom: SPACING.SM, fontSize: '0.85rem' }}>Email</p>
                    <p style={{ color: BORDEAUX, fontWeight: 600 }}>{profileStatus.data?.email || user?.email || 'Não disponível'}</p>
                  </div>
                  <div>
                    <p style={{ color: '#9B7B6A', marginBottom: SPACING.SM, fontSize: '0.85rem' }}>Gênero</p>
                    <p style={{ color: BORDEAUX, fontWeight: 600 }}>{profileStatus.data?.genero || 'Não informado'}</p>
                  </div>
                  <div>
                    <p style={{ color: '#9B7B6A', marginBottom: SPACING.SM, fontSize: '0.85rem' }}>CEP</p>
                    <p style={{ color: BORDEAUX, fontWeight: 600 }}>{profileStatus.data?.cep || 'Não informado'}</p>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <p style={{ color: '#9B7B6A', marginBottom: SPACING.SM, fontSize: '0.85rem' }}>UID do Firebase</p>
                    <p style={{ color: BORDEAUX, fontWeight: 600, wordBreak: 'break-all', fontSize: '0.85rem' }}>
                      {profileStatus.data?.uid || user?.uid || 'Não disponível'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* API Test Card */}
            <div
              style={{
                backgroundColor: '#fff',
                border: `1.5px solid ${BORDEAUX}22`,
                borderRadius: '0.75rem',
                padding: SPACING.LG,
                marginBottom: SPACING.XL,
              }}
            >
              <h2 style={{ color: BORDEAUX, fontWeight: 700, marginBottom: SPACING.MD, fontSize: '1.1rem' }}>
                Teste de Acesso Protegido
              </h2>
              {apiStatus.loading ? (
                <p style={{ color: '#9B7B6A' }}>Testando acesso à rota protegida...</p>
              ) : apiStatus.error ? (
                <div
                  style={{
                    backgroundColor: '#FEE2E2',
                    color: '#7F1D1D',
                    padding: SPACING.MD,
                    borderRadius: '0.5rem',
                    border: `2px solid #FCA5A5`,
                  }}
                >
                  {apiStatus.error}
                </div>
              ) : apiStatus.data ? (
                <div
                  style={{
                    backgroundColor: '#D1FAE5',
                    color: '#065F46',
                    padding: SPACING.MD,
                    borderRadius: '0.5rem',
                    border: `2px solid #6EE7B7`,
                  }}
                >
                  Acesso autorizado. Dados recebidos: {JSON.stringify(apiStatus.data)}
                </div>
              ) : null}
            </div>

            {/* Quick Actions */}
            <div
              style={{
                backgroundColor: '#fff',
                border: `1.5px solid ${BORDEAUX}22`,
                borderRadius: '0.75rem',
                padding: SPACING.LG,
              }}
            >
              <h2 style={{ color: BORDEAUX, fontWeight: 700, marginBottom: SPACING.MD, fontSize: '1.1rem' }}>
                Ações Rápidas
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: SPACING.LG }}>
                <button
                  onClick={() => navigate('/cadastroPecas')}
                  style={{
                    padding: SPACING.MD,
                    backgroundColor: BORDEAUX,
                    color: CREAM,
                    fontWeight: 700,
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                >
                  + Cadastrar Peça
                </button>
                <button
                  onClick={() => navigate('/')}
                  style={{
                    padding: SPACING.MD,
                    backgroundColor: HIGHLIGHT,
                    color: BORDEAUX,
                    fontWeight: 700,
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                >
                  Ver Catálogo
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    </PrivateRoute>
  );
}
