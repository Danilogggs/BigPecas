import { COLORS, SPACING, TYPOGRAPHY } from '../styles/theme';

export default function Footer() {
  return (
    <footer
      style={{
        padding: SPACING.XL,
        textAlign: 'center',
        backgroundColor: '#fff',
      }}
    >
      <p style={{ ...TYPOGRAPHY.SMALL, color: COLORS.MUTED_TEXT }}>
        © 2026 BigPeças — Todos os direitos reservados
      </p>
    </footer>
  );
}