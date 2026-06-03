// ===== CORES =====
export const COLORS = {
  BORDEAUX: '#152218',        /* verde escuro primário */
  CREAM: '#EDE4CC',           /* fundo principal */
  DARK_TEXT: '#1A2820',
  MUTED_TEXT: '#6B7D6E',
  BORDER: '#CFC5A5',
  BACKGROUND_LIGHT: '#F5EDD8',
  HIGHLIGHT: '#C9A84C',       /* ouro */

  // Cores semânticas
  SUCCESS: '#D1FAE5',
  SUCCESS_DARK: '#2D6A4F',
  SUCCESS_BORDER: '#6EE7B7',

  ERROR: '#FEE2E2',
  ERROR_DARK: '#7F1D1D',
  ERROR_BORDER: '#FCA5A5',

  DISABLED_OPACITY: 0.7,
};

// ===== TIPOGRAFIA =====
export const TYPOGRAPHY = {
  FONT_FAMILY: 'inherit',
  
  H1: {
    fontSize: '1.5rem',
    fontWeight: 700,
  },
  
  H2: {
    fontSize: '1.1rem',
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
    fontSize: '0.9rem',
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
  MD: '0.625rem',
  LG: '1rem',
  FULL: '9999px',
};

// ===== SOMBRAS =====
export const SHADOWS = {
  SM: '0 2px 8px rgba(0,0,0,0.08)',
  MD: '0 4px 12px rgba(0,0,0,0.12)',
  LG: '0 8px 24px rgba(0,0,0,0.16)',
};

// ===== ESTILOS REUTILIZÁVEIS =====

// Input base
export const INPUT_STYLE = {
  padding: `${SPACING.MD} ${SPACING.SM}`,
  border: `2px solid ${COLORS.BORDER}`,
  borderRadius: BORDER_RADIUS.SM,
  fontSize: TYPOGRAPHY.BODY.fontSize,
  backgroundColor: COLORS.BACKGROUND_LIGHT,
  width: '100%',
  boxSizing: 'border-box',
  fontFamily: TYPOGRAPHY.FONT_FAMILY,
  color: COLORS.DARK_TEXT,
  outline: 'none',
  transition: 'border-color 0.2s',
  
  '&:focus': {
    borderColor: COLORS.BORDEAUX,
  },
};

// Label base
export const LABEL_STYLE = {
  display: 'block',
  marginBottom: SPACING.SM / 2,
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
  opacity: 1,
  transition: 'all 0.2s',
  
  '&:hover:not(:disabled)': {
    opacity: 0.9,
  },
  
  '&:disabled': {
    opacity: COLORS.DISABLED_OPACITY,
    cursor: 'not-allowed',
  },
};

// Botão secundário
export const BUTTON_SECONDARY_STYLE = {
  padding: `${SPACING.SM} ${SPACING.LG}`,
  borderRadius: BORDER_RADIUS.MD,
  border: `2px solid ${COLORS.BORDEAUX}`,
  backgroundColor: 'transparent',
  color: COLORS.BORDEAUX,
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: TYPOGRAPHY.BODY.fontSize,
  transition: 'all 0.2s',
  
  '&:hover': {
    backgroundColor: `${COLORS.BORDEAUX}22`,
  },
};

// Alerta de sucesso
export const ALERT_SUCCESS_STYLE = {
  padding: SPACING.MD,
  marginBottom: SPACING.LG,
  borderRadius: BORDER_RADIUS.SM,
  backgroundColor: COLORS.SUCCESS,
  color: COLORS.SUCCESS_DARK,
  border: `2px solid ${COLORS.SUCCESS_BORDER}`,
  fontSize: TYPOGRAPHY.BODY.fontSize,
};

// Alerta de erro
export const ALERT_ERROR_STYLE = {
  padding: SPACING.MD,
  marginBottom: SPACING.LG,
  borderRadius: BORDER_RADIUS.SM,
  backgroundColor: COLORS.ERROR,
  color: COLORS.ERROR_DARK,
  border: `2px solid ${COLORS.ERROR_BORDER}`,
  fontSize: TYPOGRAPHY.BODY.fontSize,
};

// Card
export const CARD_STYLE = {
  backgroundColor: '#fff',
  borderRadius: BORDER_RADIUS.LG,
  border: `2px solid ${COLORS.BORDEAUX}22`,
  padding: SPACING.XL,
  boxShadow: SHADOWS.SM,
};

// Container página
export const PAGE_CONTAINER_STYLE = {
  minHeight: '100vh',
  backgroundColor: COLORS.CREAM,
  display: 'flex',
  flexDirection: 'column',
};

// Header
export const HEADER_STYLE = {
  backgroundColor: COLORS.BORDEAUX,
  padding: `${SPACING.MD} ${SPACING.XL}`,
  color: COLORS.CREAM,
  textShadow: '1px 1px 4px rgba(0,0,0,0.35)',
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
  alignItems: 'flex-start',
};

export const FLEX_GAP = {
  display: 'flex',
  gap: SPACING.MD,
};

// ===== FUNÇÃO AUXILIAR PARA APLICAR ESTILOS COM :hover e :disabled =====
export const applyHoverStyle = (element, hoverStyle) => {
  element.addEventListener('mouseenter', () => {
    Object.assign(element.style, hoverStyle);
  });
  element.addEventListener('mouseleave', () => {
    Object.assign(element.style, {});
  });
};
