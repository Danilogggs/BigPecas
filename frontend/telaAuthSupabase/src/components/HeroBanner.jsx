/**
 * HeroBanner.jsx
 * Seção de destaque com título, descrição e CTA
 */

import { useNavigate } from 'react-router-dom';

const BORDEAUX = '#7B1D2E';
const HIGHLIGHT = '#F0C060';
const SPACING = {
  SM: '0.5rem',
  LG: '1.5rem',
  XXL: '2.5rem',
};

export default function HeroBanner() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        padding: SPACING.XXL,
        background: `linear-gradient(120deg, ${BORDEAUX}EE 0%, ${BORDEAUX}99 60%, transparent 100%)`,
        minHeight: 200,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url('https://images.unsplash.com/photo-1591278169757-deac26e49555?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvbGQlMjByZXRybyUyMGNhciUyMHJlc3RvcmF0aW9uJTIwZ2FyYWdlfGVufDF8fHx8MTc3NDMwMDcyNXww&ixlib=rb-4.1.0&q=80&w=1080')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.2,
        }}
      />
      <div style={{ position: 'relative', zIndex: 10 }}>
        <h1
          style={{
            marginBottom: SPACING.SM,
            color: HIGHLIGHT,
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
          }}
        >
          Encontre as melhores peças para restaurar o seu automóvel vintage com qualidade e procedência garantida.
        </p>
        <button
          onClick={() => navigate('/cadastroPecas')}
          style={{
            marginTop: SPACING.XXL,
            paddingLeft: SPACING.LG,
            paddingRight: SPACING.LG,
            paddingTop: '0.625rem',
            paddingBottom: '0.625rem',
            borderRadius: '9999px',
            fontSize: '0.875rem',
            backgroundColor: HIGHLIGHT,
            color: BORDEAUX,
            fontWeight: 700,
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          Ver Catálogo Completo
        </button>
      </div>
    </div>
  );
}