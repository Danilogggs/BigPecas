import {
  DEFAULT_VISUAL_PREFERENCES,
  normalizarPreferenciasVisuais,
} from '../domain/preferenciasVisuais';

export const ACCESSIBILITY_STORAGE_KEY = 'bigpecas-visual-accessibility';

export function criarBrowserAccessibilityPreferencesGateway(storage) {
  return {
    load() {
      if (!storage) return { ...DEFAULT_VISUAL_PREFERENCES };

      try {
        const savedPreferences = storage.getItem(ACCESSIBILITY_STORAGE_KEY);
        if (!savedPreferences) return { ...DEFAULT_VISUAL_PREFERENCES };
        return normalizarPreferenciasVisuais(JSON.parse(savedPreferences));
      } catch {
        return { ...DEFAULT_VISUAL_PREFERENCES };
      }
    },

    save(preferences) {
      if (!storage) return false;

      try {
        storage.setItem(
          ACCESSIBILITY_STORAGE_KEY,
          JSON.stringify(normalizarPreferenciasVisuais(preferences)),
        );
        return true;
      } catch {
        return false;
      }
    },
  };
}

function obterBrowserStorage() {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

const browserStorage = obterBrowserStorage();

export const browserAccessibilityPreferencesGateway =
  criarBrowserAccessibilityPreferencesGateway(browserStorage);
