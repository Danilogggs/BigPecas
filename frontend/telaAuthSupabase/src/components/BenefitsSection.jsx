import {
  COLORS,
  SPACING,
  TYPOGRAPHY,
  BORDER_RADIUS,
  SHADOWS,
} from '../styles/theme';

const benefits = [
  {
    title: 'Peças Originais',
    desc: 'Trabalhamos apenas com peças verificadas e fornecedores confiáveis.',
    icon: '🏆',
  },
  {
    title: 'Entrega Garantida',
    desc: 'Envio seguro para todo o Brasil com rastreamento.',
    icon: '📦',
  },
  {
    title: 'Suporte Especializado',
    desc: 'Nossa equipe entende de carros clássicos de verdade.',
    icon: '🧠',
  },
];

export default function BenefitsSection() {
  return (
    <div style={{ padding: SPACING.XXL }}>
      <h2 style={{ ...TYPOGRAPHY.H1, color: COLORS.BORDEAUX, fontFamily: "'Georgia', serif", }}>
        Por que escolher a BigPeças?
      </h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: SPACING.LG,
          marginTop: SPACING.XL,
        }}
      >
        {benefits.map((b, i) => (
          <div
            key={i}
            style={{
              padding: SPACING.XL,
              borderRadius: BORDER_RADIUS.LG,
              backgroundColor: '#fff',
              border: `1px solid ${COLORS.BORDER}`,
              boxShadow: SHADOWS.SM,
              transition: 'all 0.25s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-6px)';
              e.currentTarget.style.boxShadow = SHADOWS.MD;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = SHADOWS.SM;
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: SPACING.SM }}>
              {b.icon}
            </div>

            <h3 style={{ ...TYPOGRAPHY.H2, color: COLORS.BORDEAUX }}>
              {b.title}
            </h3>

            <p style={{ ...TYPOGRAPHY.BODY, color: COLORS.MUTED_TEXT }}>
              {b.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}