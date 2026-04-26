/**
 * ProductCard.jsx
 * Card de produto individual com imagem, nome, preço e ação
 */

import { useNavigate } from 'react-router-dom';

const BORDEAUX = '#7B1D2E';
const HIGHLIGHT = '#F0C060';

export default function ProductCard({ product }) {
  const navigate = useNavigate();

  return (
    <div
      style={{
        borderRadius: '1rem',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#fff',
        border: '1px solid #EAD8BE',
        transition: 'all 0.2s',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Image */}
      <div style={{ position: 'relative', height: 160 }}>
        <img
          src={product.image}
          alt={product.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
          onError={(e) => {
            e.currentTarget.src = 'https://via.placeholder.com/280x160?text=Imagem+Indisponível';
          }}
        />
        <span
          style={{
            position: 'absolute',
            top: '0.5rem',
            left: '0.5rem',
            fontSize: '0.75rem',
            paddingLeft: '0.625rem',
            paddingRight: '0.625rem',
            paddingTop: '0.25rem',
            paddingBottom: '0.25rem',
            borderRadius: '9999px',
            backgroundColor: BORDEAUX,
            color: HIGHLIGHT,
            fontWeight: 700,
          }}
        >
          {product.tag}
        </span>
      </div>
      {/* Info */}
      <div
        style={{
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
        }}
      >
        <p
          style={{
            fontSize: '0.75rem',
            marginBottom: '0.25rem',
            color: '#9B7B6A',
          }}
        >
          {product.application}
        </p>
        <p
          style={{
            fontSize: '0.875rem',
            flex: 1,
            color: '#3B1A22',
            fontWeight: 600,
            lineHeight: 1.4,
          }}
        >
          {product.name}
        </p>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '1rem',
          }}
        >
          <span
            style={{
              color: BORDEAUX,
              fontWeight: 700,
              fontSize: '0.95rem',
            }}
          >
            {product.price}
          </span>
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              paddingLeft: '1rem',
              paddingRight: '1rem',
              paddingTop: '0.375rem',
              paddingBottom: '0.375rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              backgroundColor: BORDEAUX,
              color: HIGHLIGHT,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            onClick={() => navigate('/login')}
          >
            🛒 Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}