import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  DEFAULT_VISUAL_PREFERENCES,
  criarAtributosVisuais,
  mesclarPreferenciasVisuais,
  preferenciasSaoPadrao,
} from '../domain/preferenciasVisuais';
import { browserAccessibilityPreferencesGateway } from '../infrastructure/browserAccessibilityPreferencesGateway';

export function useAccessibilityPreferences(
  gateway = browserAccessibilityPreferencesGateway,
) {
  const [preferences, setPreferencesState] = useState(() => gateway.load());

  useLayoutEffect(() => {
    const attributes = criarAtributosVisuais(preferences);
    const root = document.documentElement;

    root.dataset.textScale = attributes.textScale;
    root.dataset.readableFont = attributes.readableFont;
    root.dataset.emphasizeLinks = attributes.emphasizeLinks;
    gateway.save(preferences);
  }, [gateway, preferences]);

  const setPreferences = useCallback((changes) => {
    setPreferencesState((current) => mesclarPreferenciasVisuais(current, changes));
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferencesState({ ...DEFAULT_VISUAL_PREFERENCES });
  }, []);

  return useMemo(() => ({
    preferences,
    setPreferences,
    resetPreferences,
    isDefault: preferenciasSaoPadrao(preferences),
  }), [preferences, resetPreferences, setPreferences]);
}
