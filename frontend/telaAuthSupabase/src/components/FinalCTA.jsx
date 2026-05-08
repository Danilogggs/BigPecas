import { useNavigate } from 'react-router-dom';
import {
  COLORS,
  SPACING,
  TYPOGRAPHY,
  BORDER_RADIUS,
} from '../styles/theme';

export default function FinalCTA() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        padding: SPACING.XXL,
        textAlign: 'center',
        backgroundColor: COLORS.BORDEAUX,
        color: COLORS.CREAM,
      }}
    >
      <h2 style={{ ...TYPOGRAPHY.H1 }}>
        Encontre a peça ideal hoje mesmo
      </h2>

      <p style={{ marginTop: SPACING.SM }}>
        Milhares de peças disponíveis para veículos clássicos.
      </p>

      <button
        onClick={() => navigate('/buscaPecas')}
        style={{
          marginTop: SPACING.LG,
          padding: `${SPACING.SM} ${SPACING.XL}`,
          borderRadius: BORDER_RADIUS.FULL,
          backgroundColor: COLORS.CREAM,
          color: COLORS.BORDEAUX,
          border: 'none',
          cursor: 'pointer',
          fontWeight: 600,
        }}
      >
        Explorar catálogo
      </button>
    </div>
    
  );
}