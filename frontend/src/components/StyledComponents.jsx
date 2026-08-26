import React from 'react';
import {
  BUTTON_PRIMARY_STYLE,
  BUTTON_SECONDARY_STYLE,
  ALERT_SUCCESS_STYLE,
  ALERT_ERROR_STYLE,
  INPUT_STYLE,
  LABEL_STYLE,
  TEXTAREA_STYLE,
  COLORS,
} from '../styles/theme';
import { useLanguage } from '../contexts/LanguageContext';

// ===== BOTÃO PRIMÁRIO =====
export function ButtonPrimary({ children, onClick, disabled = false, type = 'button', ...props }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...BUTTON_PRIMARY_STYLE,
        opacity: disabled ? 0.7 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={(e) => !disabled && (e.target.style.opacity = 0.9)}
      onMouseLeave={(e) => !disabled && (e.target.style.opacity = 1)}
      {...props}
    >
      {children}
    </button>
  );
}

// ===== BOTÃO SECUNDÁRIO =====
export function ButtonSecondary({ children, onClick, ...props }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={BUTTON_SECONDARY_STYLE}
      onMouseEnter={(e) => (e.target.style.backgroundColor = `${COLORS.BORDEAUX}22`)}
      onMouseLeave={(e) => (e.target.style.backgroundColor = 'transparent')}
      {...props}
    >
      {children}
    </button>
  );
}

// ===== INPUT CUSTOMIZADO =====
export function Input({
  placeholder,
  type = 'text',
  value,
  onChange,
  required = false,
  name,
  ...props
}) {
  const { t } = useLanguage();
  return (
    <input
      type={type}
      name={name}
      placeholder={placeholder ? t(placeholder) : placeholder}
      value={value}
      onChange={onChange}
      required={required}
      style={INPUT_STYLE}
      {...props}
    />
  );
}

// ===== SELECT CUSTOMIZADO =====
export function Select({ value, onChange, required = false, name, children, ...props }) {
  return (
    <select
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      style={INPUT_STYLE}
      {...props}
    >
      {children}
    </select>
  );
}

// ===== TEXTAREA CUSTOMIZADO =====
export function TextArea({
  placeholder,
  value,
  onChange,
  required = false,
  name,
  ...props
}) {
  const { t } = useLanguage();
  return (
    <textarea
      name={name}
      placeholder={placeholder ? t(placeholder) : placeholder}
      value={value}
      onChange={onChange}
      required={required}
      style={TEXTAREA_STYLE}
      {...props}
    />
  );
}

// ===== LABEL CUSTOMIZADO =====
export function Label({ children, required = false }) {
  const { t } = useLanguage();
  return (
    <label style={LABEL_STYLE}>
      {typeof children === 'string' ? t(children) : children}
      {required && <span style={{ color: COLORS.BORDEAUX, marginLeft: '0.2rem' }}>*</span>}
    </label>
  );
}

// ===== ALERT SUCESSO =====
export function AlertSuccess({ children }) {
  return <div style={ALERT_SUCCESS_STYLE}>{children}</div>;
}

// ===== ALERT ERRO =====
export function AlertError({ children }) {
  return <div style={ALERT_ERROR_STYLE}>{children}</div>;
}

// ===== FIELD (Wrapper Label + Input) =====
export function Field({ label, required = false, children, ...props }) {
  const { t } = useLanguage();
  return (
    <div {...props}>
      <Label required={required}>{t(label)}</Label>
      {children}
    </div>
  );
}
