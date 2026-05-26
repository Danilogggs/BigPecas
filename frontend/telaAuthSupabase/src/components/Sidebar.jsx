/**
 * Sidebar.jsx
 * Menu lateral com navegação principal e cartão de suporte
 */

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { WrenchIcon, BoltIcon } from './Icons';

const BORDEAUX = '#7B1D2E';
const CREAM = '#F5EDD8';
const HIGHLIGHT = '#F0C060';
const SPACING = {
  MD: '1rem',
  LG: '1.5rem',
  XL: '2rem',
};

export default function Sidebar({ activeNav, setActiveNav }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <aside
      style={{
        width: '20%',
        backgroundColor: BORDEAUX,
        padding: `${SPACING.XL} 0`,
        display: 'flex',
        flexDirection: 'column',
        gap: SPACING.LG,
      }}
    >
      {/* Main navigation */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
              gap: SPACING.MD,
              padding: `${SPACING.MD} ${SPACING.LG}`,
              backgroundColor: activeNav === key ? `${HIGHLIGHT}33` : 'transparent',
              border: 'none',
              borderLeft: activeNav === key ? `4px solid ${HIGHLIGHT}` : '4px solid transparent',
              color: activeNav === key ? HIGHLIGHT : CREAM,
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              transition: 'all 0.25s',
              marginLeft: activeNav === key ? '-4px' : '0',
            }}
            onMouseEnter={(e) => {
              if (activeNav !== key) {
                e.currentTarget.style.backgroundColor = `${HIGHLIGHT}22`;
              }
            }}
            onMouseLeave={(e) => {
              if (activeNav !== key) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>

      {/* Divider */}
      <div
        style={{
          height: '1px',
          backgroundColor: 'rgba(245,237,216,0.15)',
          margin: `0 ${SPACING.LG}`,
        }}
      />

      {/* Info card */}
      {user && (
        <div
          style={{
            margin: `0 ${SPACING.LG}`,
            padding: SPACING.LG,
            backgroundColor: 'rgba(245,237,216,0.08)',
            borderRadius: '0.625rem',
            border: `1.5px solid ${HIGHLIGHT}44`,
          }}
        >
          <p
            style={{
              fontSize: '0.75rem',
              color: CREAM,
              margin: `0 0 ${SPACING.MD} 0`,
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Bem-vindo!
          </p>
          <p
            style={{
              fontSize: '0.875rem',
              color: HIGHLIGHT,
              margin: `0 0 ${SPACING.LG} 0`,
              fontWeight: 600,
            }}
          >
            {user.email || 'Usuário'}
          </p>
          <button
            onClick={() => navigate('/cadastroPecas')}
            style={{
              width: '100%',
              padding: `${SPACING.MD} ${SPACING.MD}`,
              borderRadius: '0.5rem',
              backgroundColor: HIGHLIGHT,
              border: 'none',
              color: BORDEAUX,
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.25s',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#E8B860';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = HIGHLIGHT;
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Adicionar Peça
          </button>
        </div>
      )}
    </aside>
  );
}