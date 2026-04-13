/**
 * Sidebar.jsx
 * Menu lateral com navegação principal e cartão de suporte
 */

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { WrenchIcon, BoltIcon } from './Icons';

const BORDEAUX = '#6B1E2D';
const CREAM = '#F4E9D8';
const GOLD = '#C2A878';

export default function Sidebar({ activeNav, setActiveNav }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <aside
      style={{
        width: '20%',
        minHeight: 'calc(100vh - 72px)',
        backgroundColor: BORDEAUX,
        padding: '2rem 0',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
      }}
    >
      {/* Navegação principal */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {[
          { label: 'Catálogo', icon: WrenchIcon, key: 'catalog' },
          { label: 'FAQ', icon: BoltIcon, key: 'faq' },
          { label: 'Fornecedores', icon: BoltIcon, key: 'suppliers' },
        ].map(({ label, icon: Icon, key }) => (
          <button
            key={key}
            onClick={() => {
              setActiveNav(key);
              if (key === 'catalog') navigate('/buscaPecas');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '0.875rem 1.5rem',
              backgroundColor: activeNav === key ? `${GOLD}2A` : 'transparent',
              border: 'none',
              borderLeft: activeNav === key ? `3px solid ${GOLD}` : '3px solid transparent',
              color: activeNav === key ? GOLD : CREAM,
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: activeNav === key ? 600 : 400,
              transition: 'all 0.2s',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => {
              if (activeNav !== key) {
                e.currentTarget.style.backgroundColor = `${GOLD}18`;
              }
            }}
            onMouseLeave={(e) => {
              if (activeNav !== key) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </nav>

      {/* Divisor */}
      <div
        style={{
          height: '1px',
          backgroundColor: 'rgba(244,233,216,0.12)',
          margin: '0 1.5rem',
        }}
      />

      {/* Info card (usuário autenticado) */}
      {user && (
        <div
          style={{
            margin: '0 1rem',
            padding: '1.25rem',
            backgroundColor: 'rgba(244,233,216,0.07)',
            borderRadius: '0.875rem',
            border: `1px solid ${GOLD}33`,
          }}
        >
          <p
            style={{
              fontSize: '0.7rem',
              color: CREAM,
              marginBottom: '0.25rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Bem-vindo
          </p>
          <p
            style={{
              fontSize: '0.8rem',
              color: GOLD,
              marginBottom: '1rem',
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {user.email || 'Usuário'}
          </p>
          <button
            onClick={() => navigate('/cadastroPecas')}
            style={{
              width: '100%',
              padding: '0.625rem',
              borderRadius: '0.5rem',
              backgroundColor: GOLD,
              border: 'none',
              color: '#2C1A17',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.85';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.transform = 'none';
            }}
          >
            Adicionar Peça
          </button>
        </div>
      )}
    </aside>
  );
}
