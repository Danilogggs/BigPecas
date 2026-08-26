import { createContext, useContext } from 'react';
import { useAccessibilityPreferences } from '../features/acessibilidade/application/useAccessibilityPreferences';

const AccessibilityContext = createContext(null);

export function AccessibilityProvider({ children, gateway }) {
  const value = useAccessibilityPreferences(gateway);

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
}
