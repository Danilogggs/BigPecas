// ===== CORES =====
export const COLORS = {
  // Paleta principal (baseada no example_design)
  BORDEAUX: '#6B1E2D',
  BORDEAUX_DARK: '#541723',
  CREAM: '#F4E9D8',
  GOLD: '#C2A878',
  GOLD_DARK: '#7C6540',
  DARK_TEXT: '#2C1A17',
  MUTED_TEXT: '#6A5F58',
  PAGE_BG: '#FAF6EF',
  BORDER: '#D8CFC2',
  CARD_BG: '#FFFFFF',

  // Mantidos por compatibilidade
  BACKGROUND_LIGHT: '#FAF6EF',

  // Cores semânticas
  SUCCESS: '#D1FAE5',
  SUCCESS_DARK: '#065F46',
  SUCCESS_BORDER: '#6EE7B7',

  ERROR: '#FEE2E2',
  ERROR_DARK: '#7F1D1D',
  ERROR_BORDER: '#FCA5A5',

  DISABLED_OPACITY: 0.7,
};

// ===== TIPOGRAFIA =====
export const TYPOGRAPHY = {
  FONT_FAMILY: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  FONT_SERIF: "'Georgia', 'Times New Roman', serif",

  H1: {
    fontSize: '1.75rem',
    fontWeight: 700,
  },

  H2: {
    fontSize: '1.2rem',
    fontWeight: 600,
  },

  BODY: {
    fontSize: '0.95rem',
    fontWeight: 400,
  },

  LABEL: {
    fontSize: '0.875rem',
    fontWeight: 600,
  },

  SMALL: {
    fontSize: '0.8rem',
  },

  EYEBROW: {
    fontSize: '0.7rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.25em',
  },
};

// ===== ESPAÇAMENTO =====
export const SPACING = {
  XS: '0.25rem',
  SM: '0.5rem',
  MD: '1rem',
  LG: '1.5rem',
  XL: '2rem',
  XXL: '2.5rem',
};

// ===== BORDER RADIUS =====
export const BORDER_RADIUS = {
  SM: '0.5rem',
  MD: '0.75rem',
  LG: '1rem',
  XL: '1.5rem',
  FULL: '9999px',
};

// ===== SOMBRAS =====
export const SHADOWS = {
  XS: '0 1px 3px rgba(0,0,0,0.06)',
  SM: '0 2px 8px rgba(44,26,23,0.08)',
  MD: '0 4px 16px rgba(44,26,23,0.10)',
  LG: '0 12px 32px rgba(44,26,23,0.14)',
  XL: '0 20px 48px rgba(44,26,23,0.16)',
};

// ===== ESTILOS REUTILIZÁVEIS =====

// Input base
export const INPUT_STYLE = {
  padding: `${SPACING.MD} ${SPACING.MD}`,
  border: `1.5px solid ${COLORS.BORDER}`,
  borderRadius: BORDER_RADIUS.MD,
  fontSize: TYPOGRAPHY.BODY.fontSize,
  backgroundColor: COLORS.PAGE_BG,
  width: '100%',
  boxSizing: 'border-box',
  fontFamily: TYPOGRAPHY.FONT_FAMILY,
  color: COLORS.DARK_TEXT,
  outline: 'none',
  transition: 'border-color 0.2s',
};

// Label base
export const LABEL_STYLE = {
  display: 'block',
  marginBottom: SPACING.SM,
  fontSize: TYPOGRAPHY.LABEL.fontSize,
  fontWeight: TYPOGRAPHY.LABEL.fontWeight,
  color: COLORS.MUTED_TEXT,
};

// Textarea base
export const TEXTAREA_STYLE = {
  ...INPUT_STYLE,
  minHeight: '80px',
  fontFamily: 'inherit',
  resize: 'vertical',
};

// Botão primário
export const BUTTON_PRIMARY_STYLE = {
  padding: `${SPACING.SM} ${SPACING.LG}`,
  borderRadius: BORDER_RADIUS.MD,
  backgroundColor: COLORS.BORDEAUX,
  color: COLORS.CREAM,
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: TYPOGRAPHY.BODY.fontSize,
  border: 'none',
  transition: 'all 0.2s',
};

// Botão secundário
export const BUTTON_SECONDARY_STYLE = {
  padding: `${SPACING.SM} ${SPACING.LG}`,
  borderRadius: BORDER_RADIUS.MD,
  border: `1.5px solid ${COLORS.BORDEAUX}`,
  backgroundColor: 'transparent',
  color: COLORS.BORDEAUX,
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: TYPOGRAPHY.BODY.fontSize,
  transition: 'all 0.2s',
};

// Alerta de sucesso
export const ALERT_SUCCESS_STYLE = {
  padding: SPACING.MD,
  marginBottom: SPACING.LG,
  borderRadius: BORDER_RADIUS.MD,
  backgroundColor: COLORS.SUCCESS,
  color: COLORS.SUCCESS_DARK,
  border: `1.5px solid ${COLORS.SUCCESS_BORDER}`,
  fontSize: TYPOGRAPHY.BODY.fontSize,
};

// Alerta de erro
export const ALERT_ERROR_STYLE = {
  padding: SPACING.MD,
  marginBottom: SPACING.LG,
  borderRadius: BORDER_RADIUS.MD,
  backgroundColor: COLORS.ERROR,
  color: COLORS.ERROR_DARK,
  border: `1.5px solid ${COLORS.ERROR_BORDER}`,
  fontSize: TYPOGRAPHY.BODY.fontSize,
};

// Card
export const CARD_STYLE = {
  backgroundColor: COLORS.CARD_BG,
  borderRadius: BORDER_RADIUS.LG,
  border: `1px solid ${COLORS.BORDER}`,
  padding: SPACING.XL,
  boxShadow: SHADOWS.SM,
};

// Container página
export const PAGE_CONTAINER_STYLE = {
  minHeight: '100vh',
  backgroundColor: COLORS.PAGE_BG,
  display: 'flex',
  flexDirection: 'column',
};

// Header
export const HEADER_STYLE = {
  backgroundColor: COLORS.BORDEAUX,
  padding: `0 ${SPACING.XL}`,
  color: COLORS.CREAM,
};

// Main content
export const MAIN_CONTENT_STYLE = {
  flex: 1,
  padding: SPACING.XL,
  overflow: 'auto',
};

// Grid responsivo
export const GRID_TWO_COLUMNS = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: SPACING.LG,
};

export const GRID_FOUR_COLUMNS = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 1fr 1fr',
  gap: SPACING.LG,
};

export const GRID_ONE_COLUMN = {
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: SPACING.LG,
};

// Flex utilities
export const FLEX_CENTER = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
};

export const FLEX_BETWEEN = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

export const FLEX_GAP = {
  display: 'flex',
  gap: SPACING.MD,
};
