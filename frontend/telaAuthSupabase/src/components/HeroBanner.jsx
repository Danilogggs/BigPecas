/**
 * HeroBanner.jsx
 * Seção principal da home com chamada para o catálogo
 */

import { useNavigate } from 'react-router-dom';

const BORDEAUX = '#7B1D2E';
const DEEP_BORDEAUX = '#4E0F1C';
const CREAM = '#F5EDD8';
const HIGHLIGHT = '#F0C060';
const WHITE = '#FFFFFF';
const SPACING = {
  SM: '0.5rem',
  MD: '1rem',
  LG: '1.5rem',
  XL: '2rem',
  XXL: '2.5rem',
};

export default function HeroBanner() {
  const navigate = useNavigate();

  const primaryButtonStyle = {
    padding: '0.85rem 1.5rem',
    borderRadius: '9999px',
    fontSize: '0.9rem',
    backgroundColor: HIGHLIGHT,
    color: BORDEAUX,
    fontWeight: 800,
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 14px 28px rgba(0, 0, 0, 0.18)',
    transition: 'all 0.2s ease',
  };

  const secondaryButtonStyle = {
    ...primaryButtonStyle,
    backgroundColor: 'rgba(255,255,255,0.10)',
    color: CREAM,
    border: '1.5px solid rgba(255,255,255,0.45)',
    boxShadow: 'none',
  };

  return (
    <section
      style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.2fr) minmax(280px, 0.8fr)',
        gap: SPACING.XXL,
        alignItems: 'center',
        padding: `clamp(2rem, 5vw, 4rem) ${SPACING.XXL}`,
        background: `radial-gradient(circle at 20% 20%, rgba(240,192,96,0.24), transparent 30%), linear-gradient(135deg, ${DEEP_BORDEAUX} 0%, ${BORDEAUX} 58%, #9B2A3E 100%)`,
        minHeight: 360,
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
          opacity: 0.14,
        }}
      />

      <div style={{ position: 'relative', zIndex: 2, maxWidth: 760 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: SPACING.SM,
            padding: '0.45rem 0.85rem',
            borderRadius: '9999px',
            color: HIGHLIGHT,
            backgroundColor: 'rgba(255,255,255,0.10)',
            border: '1px solid rgba(240,192,96,0.35)',
            fontSize: '0.78rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          Marketplace automotivo vintage
        </span>

        <h1
          style={{
            margin: `${SPACING.LG} 0 ${SPACING.MD}`,
            color: HIGHLIGHT,
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 'clamp(2rem, 4vw, 3.5rem)',
            lineHeight: 1.05,
            fontWeight: 800,
            letterSpacing: '-1px',
          }}
        >
          Encontre peças cadastradas para restaurar clássicos com confiança.
        </h1>

        <p
          style={{
            fontSize: '1rem',
            maxWidth: '40rem',
            color: 'rgba(255,255,255,0.88)',
            lineHeight: 1.7,
            margin: 0,
          }}
        >
          Busque por nome, categoria, preço e data de cadastro. Acesse o catálogo e visualize as peças disponíveis na BigPeças.
        </p>

        <div style={{ display: 'flex', gap: SPACING.MD, flexWrap: 'wrap', marginTop: SPACING.XL }}>
          <button
            type="button"
            onClick={() => navigate('/buscaPecas')}
            style={primaryButtonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.opacity = '0.92';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.opacity = '1';
            }}
          >
            Explorar catálogo
          </button>

          <button
            type="button"
            onClick={() => navigate('/buscaPecas')}
            style={secondaryButtonStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.16)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.10)';
            }}
          >
            Ver peças cadastradas
          </button>
        </div>
      </div>

      <div
        style={{
          position: 'relative',
          zIndex: 2,
          backgroundColor: 'rgba(255,255,255,0.12)',
          border: '1px solid rgba(255,255,255,0.24)',
          borderRadius: '1.5rem',
          padding: SPACING.XL,
          backdropFilter: 'blur(10px)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.22)',
        }}
      >
        <div style={{ color: WHITE, fontWeight: 800, fontSize: '1rem', marginBottom: SPACING.LG }}>
          Catálogo em tempo real
        </div>

        {[
          ['Filtros rápidos', 'por categoria, nome e preço'],
          ['Peças cadastradas', 'listagem vinda do backend'],
          ['Busca inteligente', 'encontre itens específicos'],
        ].map(([title, desc]) => (
          <div
            key={title}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: SPACING.MD,
              padding: `${SPACING.MD} 0`,
              borderTop: '1px solid rgba(255,255,255,0.16)',
            }}
          >
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: HIGHLIGHT,
                color: BORDEAUX,
                fontWeight: 900,
              }}
            >
              ✓
            </span>
            <div>
              <strong style={{ display: 'block', color: CREAM }}>{title}</strong>
              <small style={{ color: 'rgba(245,237,216,0.75)' }}>{desc}</small>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
