/**
 * FeaturedProducts.jsx
 * Seção de produtos em destaque
 */

import { useNavigate } from 'react-router-dom';
import ProductCard from './ProductCard';

const BORDEAUX = '#7B1D2E';
const SPACING = {
  MD: '1rem',
  LG: '1.5rem',
  XXL: '2.5rem',
};

export default function FeaturedProducts({ items }) {
  const navigate = useNavigate();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: SPACING.XXL,
        paddingRight: SPACING.XXL,
        paddingTop: SPACING.XXL,
        paddingBottom: SPACING.MD,
        marginBottom: SPACING.XXL,
      }}
    >
      <div>
        <h2
          style={{
            color: BORDEAUX,
            fontFamily: "'Georgia', serif",
            fontSize: '1.2rem',
            fontWeight: 700,
          }}
        >
          Peças em Destaque
        </h2>
        <p
          style={{
            fontSize: '0.75rem',
            marginTop: '0.125rem',
            color: '#9B7B6A',
          }}
        >
          Seleção especial para restauradores exigentes
        </p>
      </div>
      <button
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: SPACING.MD,
          fontSize: '0.75rem',
          paddingLeft: SPACING.MD,
          paddingRight: SPACING.MD,
          paddingTop: '0.5rem',
          paddingBottom: '0.5rem',
          borderRadius: '9999px',
          color: BORDEAUX,
          border: `1.5px solid ${BORDEAUX}`,
          backgroundColor: 'transparent',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        onClick={() => navigate('/cadastroPecas')}
      >
        Ver todos ›
      </button>
    </div>
  );
}