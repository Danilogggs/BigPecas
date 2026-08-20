import { createContext, useContext, useLayoutEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'bigpecas-theme';
const VALID_THEMES = new Set(['light', 'dark']);

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

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme === 'light' ? 'light' : 'dark';

    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // A troca visual ainda funciona mesmo se o navegador bloquear o localStorage.
    }
  }, [theme]);

  const value = useMemo(() => ({
    theme,
    setTheme: (nextTheme) => {
      if (VALID_THEMES.has(nextTheme)) setThemeState(nextTheme);
    },
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}
