/**
 * FeaturedProducts.jsx
 * Seção de produtos em destaque (header da seção)
 */

import { useNavigate } from 'react-router-dom';

const BORDEAUX = '#6B1E2D';
const DARK_TEXT = '#2C1A17';
const MUTED_TEXT = '#6A5F58';

export default function FeaturedProducts({ items }) {
  const navigate = useNavigate();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '2.5rem 2.5rem 1rem',
        marginBottom: '0.5rem',
      }}
    >
      <div>
        <p
          style={{
            fontSize: '0.68rem',
            textTransform: 'uppercase',
            letterSpacing: '0.25em',
            color: '#7C6540',
            marginBottom: '0.25rem',
          }}
        >
          Destaques
        </p>
        <h2
          style={{
            color: DARK_TEXT,
            fontFamily: "'Georgia', serif",
            fontSize: '1.4rem',
            fontWeight: 600,
          }}
        >
          Peças em Destaque
        </h2>
        <p
          style={{
            fontSize: '0.78rem',
            marginTop: '0.2rem',
            color: MUTED_TEXT,
          }}
        >
          Seleção especial para restauradores exigentes
        </p>
      </div>
      <button
        style={{
          fontSize: '0.825rem',
          padding: '0.5rem 1rem',
          borderRadius: '9999px',
          color: BORDEAUX,
          border: `1.5px solid ${BORDEAUX}`,
          backgroundColor: 'transparent',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = BORDEAUX;
          e.currentTarget.style.color = '#fff';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = BORDEAUX;
        }}
        onClick={() => navigate('/buscaPecas')}
      >
        Ver todos →
      </button>
    </div>
  );
}
