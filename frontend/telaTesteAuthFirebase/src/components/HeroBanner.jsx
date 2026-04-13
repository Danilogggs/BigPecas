/**
 * HeroBanner.jsx
 * Banner de destaque usado na HomePage legada (mantido por compatibilidade)
 */

import { useNavigate } from 'react-router-dom';

const BORDEAUX = '#6B1E2D';
const BORDEAUX_DARK = '#541723';
const GOLD = '#C2A878';

export default function HeroBanner() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        padding: '2.5rem',
        background: `linear-gradient(120deg, ${BORDEAUX}EE 0%, ${BORDEAUX}99 60%, transparent 100%)`,
        minHeight: 200,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url('https://images.unsplash.com/photo-1591278169757-deac26e49555?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.18,
        }}
      />
      <div style={{ position: 'relative', zIndex: 10 }}>
        <h1
          style={{
            marginBottom: '0.5rem',
            color: GOLD,
            fontFamily: "'Georgia', serif",
            fontSize: '1.8rem',
            fontWeight: 700,
          }}
        >
          Peças Originais para Clássicos
        </h1>
        <p
          style={{
            fontSize: '0.875rem',
            maxWidth: '32rem',
            color: 'rgba(255,255,255,0.85)',
            lineHeight: 1.6,
          }}
        >
          Encontre as melhores peças para restaurar o seu automóvel vintage com qualidade e procedência garantida.
        </p>
        <button
          onClick={() => navigate('/cadastroPecas')}
          style={{
            marginTop: '2rem',
            padding: '0.625rem 1.5rem',
            borderRadius: '9999px',
            fontSize: '0.875rem',
            backgroundColor: GOLD,
            color: '#2C1A17',
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          Ver Catálogo Completo
        </button>
      </div>
    </div>
  );
}
