import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '../styles/theme';

const categories = [
  { name: 'Motor', icon: '⚙️' },
  { name: 'Suspensão', icon: '🛞' },
  { name: 'Elétrica', icon: '🔌' },
  { name: 'Acabamento', icon: '🪑' },
];

export default function CategoriesSection() {
  return (
    <div style={{ padding: SPACING.XXL }}>
      <h2 style={{ ...TYPOGRAPHY.H2, color: COLORS.DARK_TEXT }}>
        Navegue por categorias
      </h2>

      <div style={{ display: 'flex', gap: SPACING.MD, marginTop: SPACING.MD }}>
        {categories.map((cat) => (
          <div
            key={cat.name}
            style={{
              flex: 1,
              padding: SPACING.LG,
              borderRadius: BORDER_RADIUS.MD,
              backgroundColor: '#fff',
              border: `1px solid ${COLORS.BORDER}`,
              boxShadow: SHADOWS.SM,
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ fontSize: '1.5rem' }}>{cat.icon}</div>
            <p style={{ ...TYPOGRAPHY.LABEL, color: COLORS.DARK_TEXT }}>
              {cat.name}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}