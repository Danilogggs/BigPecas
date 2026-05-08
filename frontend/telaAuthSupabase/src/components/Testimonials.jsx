import {
  COLORS,
  SPACING,
  TYPOGRAPHY,
  BORDER_RADIUS,
  SHADOWS,
} from '../styles/theme';

export default function Testimonials() {
  const data = [
    {
      name: 'Carlos Silva',
      text: 'Encontrei peças raras que procurei por anos. Excelente plataforma!',
    },
    {
      name: 'Marcos Oliveira',
      text: 'Entrega rápida e produto impecável. Recomendo muito.',
    },
  ];

  return (
    <div style={{ padding: SPACING.XXL, backgroundColor: '#fff' }}>
      <h2 style={{ ...TYPOGRAPHY.H1, color: COLORS.BORDEAUX, fontFamily: "'Georgia', serif", }}>
        O que nossos clientes dizem
      </h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: SPACING.LG,
          marginTop: SPACING.XL,
        }}
      >
        {data.map((t, i) => (
          <div
            key={i}
            style={{
              padding: SPACING.LG,
              borderRadius: BORDER_RADIUS.LG,
              border: `1px solid ${COLORS.BORDER}`,
              boxShadow: SHADOWS.SM,
            }}
          >
            <p style={{ ...TYPOGRAPHY.BODY, color: COLORS.MUTED_TEXT }}>
              "{t.text}"
            </p>

            <div style={{ marginTop: SPACING.MD }}>
              <strong style={{ color: COLORS.DARK_TEXT }}>
                {t.name}
              </strong>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}