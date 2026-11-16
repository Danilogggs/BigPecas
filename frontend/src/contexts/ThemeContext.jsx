import { createContext, useContext, useLayoutEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'bigpecas-theme';
const CUSTOM_STORAGE_KEY = 'bigpecas-custom-theme';
const VALID_THEMES = new Set(['light', 'dark', 'custom']);
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export const DEFAULT_CUSTOM_THEME = Object.freeze({
  background: '#EDE4CC',
  surface: '#FFFFFF',
  primary: '#152218',
  accent: '#82620E',
  text: '#1A2820',
});

const ThemeContext = createContext(null);

function getInitialTheme() {
  try {
    const savedTheme = localStorage.getItem(STORAGE_KEY);
    if (VALID_THEMES.has(savedTheme)) return savedTheme;
  } catch {
    // O tema claro continua sendo o padrão quando o armazenamento não está disponível.
  }
  return 'light';
}

function getInitialCustomTheme() {
  try {
    const saved = JSON.parse(localStorage.getItem(CUSTOM_STORAGE_KEY));
    if (saved && Object.keys(DEFAULT_CUSTOM_THEME).every((key) => HEX_COLOR.test(saved[key]))) {
      return { ...DEFAULT_CUSTOM_THEME, ...saved };
    }
  } catch {
    // A paleta padrão personalizada é usada quando os dados salvos são inválidos.
  }
  return { ...DEFAULT_CUSTOM_THEME };
}

function mix(hexA, hexB, weight = .5) {
  const channels = [1, 3, 5].map((index) => {
    const a = parseInt(hexA.slice(index, index + 2), 16);
    const b = parseInt(hexB.slice(index, index + 2), 16);
    return Math.round(a * (1 - weight) + b * weight).toString(16).padStart(2, '0');
  });
  return `#${channels.join('')}`;
}

function isDark(hex) {
  const [r, g, b] = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}

// Contraste WCAG 2.x entre duas cores hexadecimais (1 a 21).
function luminancia(hex) {
  const [r, g, b] = [1, 3, 5].map((index) => {
    const canal = parseInt(hex.slice(index, index + 2), 16) / 255;
    return canal <= 0.03928 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(hexA, hexB) {
  const [clara, escura] = [luminancia(hexA), luminancia(hexB)].sort((a, b) => b - a);
  return (clara + 0.05) / (escura + 0.05);
}

const CONTRASTE_MINIMO_TEXTO = 4.5;

// Cor legivel sobre o fundo e as superficies ao mesmo tempo: a escolhida, se
// ja tiver contraste suficiente, ou preto/branco, o que funcionar melhor.
function corLegivel(cor, fundos) {
  const pior = (candidata) => Math.min(...fundos.map((fundo) => contraste(candidata, fundo)));
  if (pior(cor) >= CONTRASTE_MINIMO_TEXTO) return cor;
  return pior('#111111') >= pior('#FFFFFF') ? '#111111' : '#FFFFFF';
}

// Paleta personalizada pode tornar o texto invisivel (ex.: texto igual ao
// fundo). Em vez de bloquear a escolha, as cores de leitura sao ajustadas.
export function ajustarContrasteTema(palette) {
  const fundos = [palette.background, palette.surface];
  const texto = corLegivel(palette.text, fundos);
  const destaque = corLegivel(palette.primary, fundos);
  return { texto, destaque, textoAjustado: texto !== palette.text };
}

const CUSTOM_PROPERTIES = [
  '--bp-green-900', '--bp-green-800', '--bp-green-700', '--bp-green-600',
  '--bp-gold', '--bp-gold-light', '--bp-gold-pale', '--bp-cream', '--bp-cream-dark',
  '--bp-white', '--bp-surface', '--bp-surface-muted', '--bp-primary-action',
  '--bp-primary-action-hover', '--bp-on-primary', '--bp-action-text', '--bp-action-border',
  '--bp-on-light', '--bp-text', '--bp-text-sub', '--bp-text-muted', '--bp-border', '--bp-border-light',
];

function applyCustomTheme(root, palette) {
  const onPrimary = isDark(palette.primary) ? '#FFFFFF' : '#111111';
  const onAccent = isDark(palette.accent) ? '#FFFFFF' : '#111111';
  const { texto, destaque } = ajustarContrasteTema(palette);
  const values = {
    '--bp-green-900': mix(palette.primary, '#000000', .28),
    '--bp-green-800': palette.primary,
    '--bp-green-700': mix(palette.primary, '#FFFFFF', .10),
    '--bp-green-600': mix(palette.primary, '#FFFFFF', .22),
    '--bp-gold': palette.accent,
    '--bp-gold-light': mix(palette.accent, '#FFFFFF', .18),
    '--bp-gold-pale': mix(palette.accent, palette.surface, .72),
    '--bp-cream': palette.background,
    '--bp-cream-dark': mix(palette.background, palette.primary, .12),
    '--bp-white': onPrimary,
    '--bp-surface': palette.surface,
    '--bp-surface-muted': mix(palette.surface, palette.background, .48),
    '--bp-primary-action': palette.primary,
    '--bp-primary-action-hover': mix(palette.primary, '#000000', .15),
    '--bp-on-primary': onPrimary,
    '--bp-action-text': destaque,
    '--bp-action-border': destaque,
    '--bp-on-light': onAccent,
    '--bp-text': texto,
    '--bp-text-sub': mix(texto, palette.background, .18),
    '--bp-text-muted': mix(texto, palette.background, .3),
    '--bp-border': mix(texto, palette.background, .58),
    '--bp-border-light': mix(texto, palette.surface, .84),
  };
  Object.entries(values).forEach(([property, value]) => root.style.setProperty(property, value));
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme);
  const [customTheme, setCustomTheme] = useState(getInitialCustomTheme);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    CUSTOM_PROPERTIES.forEach((property) => root.style.removeProperty(property));
    if (theme === 'custom') applyCustomTheme(root, customTheme);
    root.style.colorScheme = theme === 'dark' || (theme === 'custom' && isDark(customTheme.background)) ? 'dark' : 'light';
    try {
      localStorage.setItem(STORAGE_KEY, theme);
      localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(customTheme));
    } catch {
      // A troca visual ainda funciona mesmo se o navegador bloquear o localStorage.
    }
  }, [theme, customTheme]);

  const value = useMemo(() => ({
    theme,
    customTheme,
    setTheme: (nextTheme) => { if (VALID_THEMES.has(nextTheme)) setThemeState(nextTheme); },
    updateCustomTheme: (changes) => {
      const validChanges = Object.fromEntries(Object.entries(changes).filter(([key, color]) => key in DEFAULT_CUSTOM_THEME && HEX_COLOR.test(color)));
      if (Object.keys(validChanges).length) {
        setCustomTheme((current) => ({ ...current, ...validChanges }));
        setThemeState('custom');
      }
    },
    resetCustomTheme: () => {
      setCustomTheme({ ...DEFAULT_CUSTOM_THEME });
      setThemeState('custom');
    },
  }), [theme, customTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}
