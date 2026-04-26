import {
  COLORS,
  SPACING,
  TYPOGRAPHY,
} from '../styles/theme';

export default function HowItWorks() {
  const steps = [
    {
      title: 'Busque a peça',
      desc: 'Use filtros inteligentes para encontrar exatamente o que precisa.',
    },
    {
      title: 'Compare opções',
      desc: 'Veja preços, condições e fornecedores antes de decidir.',
    },
    {
      title: 'Compre com segurança',
      desc: 'Finalize a compra com total confiança.',
    },
  ];

  return (
    <div style={{ padding: SPACING.XXL }}>
      <h2 style={{ ...TYPOGRAPHY.H1, color: COLORS.DARK_TEXT, color: COLORS.BORDEAUX, fontFamily: "'Georgia', serif", }}>
        Como funciona
      </h2>

      <div style={{ marginTop: SPACING.XL }}>
        {steps.map((step, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: SPACING.LG,
              marginBottom: SPACING.LG,
            }}
          >
            <div
              style={{
                minWidth: 40,
                height: 40,
                borderRadius: '50%',
                backgroundColor: COLORS.BORDEAUX,
                color: COLORS.CREAM,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
              }}
            >
              {i + 1}
            </div>

            <div>
              <h3 style={{ ...TYPOGRAPHY.H2, color: COLORS.DARK_TEXT }}>
                {step.title}
              </h3>
              <p style={{ ...TYPOGRAPHY.BODY, color: COLORS.MUTED_TEXT }}>
                {step.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}