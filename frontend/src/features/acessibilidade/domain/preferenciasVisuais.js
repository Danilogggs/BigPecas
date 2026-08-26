export const TEXT_SCALES = Object.freeze(['default', 'large', 'extra-large']);

export const DEFAULT_VISUAL_PREFERENCES = Object.freeze({
  textScale: 'default',
  readableFont: false,
  emphasizeLinks: false,
});

export function normalizarPreferenciasVisuais(preferences) {
  const candidate = preferences && typeof preferences === 'object' ? preferences : {};

  return {
    textScale: TEXT_SCALES.includes(candidate.textScale)
      ? candidate.textScale
      : DEFAULT_VISUAL_PREFERENCES.textScale,
    readableFont: candidate.readableFont === true,
    emphasizeLinks: candidate.emphasizeLinks === true,
  };
}

export function mesclarPreferenciasVisuais(currentPreferences, changes) {
  return normalizarPreferenciasVisuais({
    ...normalizarPreferenciasVisuais(currentPreferences),
    ...(changes && typeof changes === 'object' ? changes : {}),
  });
}

export function preferenciasSaoPadrao(preferences) {
  const normalized = normalizarPreferenciasVisuais(preferences);

  return Object.entries(DEFAULT_VISUAL_PREFERENCES).every(
    ([key, value]) => normalized[key] === value,
  );
}

export function criarAtributosVisuais(preferences) {
  const normalized = normalizarPreferenciasVisuais(preferences);

  return {
    textScale: normalized.textScale,
    readableFont: String(normalized.readableFont),
    emphasizeLinks: String(normalized.emphasizeLinks),
  };
}
