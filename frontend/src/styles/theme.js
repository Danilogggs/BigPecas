// ===== CORES =====
export const COLORS = {
  BORDEAUX: 'var(--bp-green-800)',
  CREAM: 'var(--bp-cream)',
  DARK_TEXT: 'var(--bp-text)',
  MUTED_TEXT: 'var(--bp-text-muted)',
  BORDER: 'var(--bp-border)',
  BACKGROUND_LIGHT: 'var(--bp-surface-muted)',
  HIGHLIGHT: 'var(--bp-gold)',

  // Cores semânticas
  SUCCESS: 'var(--bp-success-bg)',
  SUCCESS_DARK: 'var(--bp-success)',
  SUCCESS_BORDER: 'var(--bp-success)',

  ERROR: 'var(--bp-error-bg)',
  ERROR_DARK: 'var(--bp-error)',
  ERROR_BORDER: 'var(--bp-error)',

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
  // Nota: foco deve ser aplicado via onFocus/onBlur no componente
};

// Label base
export const LABEL_STYLE = {
  display: 'block',
  marginBottom: SPACING.XS,
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
  backgroundColor: 'var(--bp-primary-action)',
  color: 'var(--bp-on-primary)',
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: TYPOGRAPHY.BODY.fontSize,
  border: 'none',
  opacity: 1,
  transition: 'all 0.2s',
  // hover/disabled devem ser aplicados via onMouseEnter/onMouseLeave e prop disabled
};

// Botão secundário
export const BUTTON_SECONDARY_STYLE = {
  padding: `${SPACING.SM} ${SPACING.LG}`,
  borderRadius: BORDER_RADIUS.MD,
  border: '2px solid var(--bp-action-border)',
  backgroundColor: 'transparent',
  color: 'var(--bp-action-text)',
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: TYPOGRAPHY.BODY.fontSize,
  transition: 'all 0.2s',
  // hover deve ser aplicado via onMouseEnter/onMouseLeave
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
  backgroundColor: 'var(--bp-surface)',
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
  color: 'var(--bp-on-primary)',
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
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
  gap: SPACING.LG,
};

export const GRID_FOUR_COLUMNS = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
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
