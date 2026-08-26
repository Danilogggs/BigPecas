import Header from '../components/Header';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAccessibility } from '../contexts/AccessibilityContext';

const THEME_OPTIONS = [
  {
    id: 'light',
    name: 'Claro',
    description: 'Fundo claro e a paleta clássica do BigPeças.',
    colors: ['#EDE4CC', '#FFFFFF', '#152218', '#82620E'],
  },
  {
    id: 'dark',
    name: 'Escuro',
    description: 'Reduz o brilho e mantém a leitura confortável à noite.',
    colors: ['#101712', '#18221B', '#F4F0E4', '#D4B65E'],
  },
];

const TEXT_SCALE_OPTIONS = [
  {
    id: 'default',
    name: 'Padrão',
    description: 'Tamanho original da interface (100%).',
  },
  {
    id: 'large',
    name: 'Grande',
    description: 'Textos ampliados para 112,5%.',
  },
  {
    id: 'extra-large',
    name: 'Extra grande',
    description: 'Textos ampliados para 125%.',
  },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const {
    preferences,
    setPreferences,
    resetPreferences,
    isDefault,
  } = useAccessibility();
  const { t } = useLanguage();
  const selectedScale = TEXT_SCALE_OPTIONS.find(
    (option) => option.id === preferences.textScale,
  ) || TEXT_SCALE_OPTIONS[0];

  return (
    <div className="settings-page">
      <Header />

      <main className="settings-page__main">
        <section className="settings-card" aria-labelledby="settings-title">
          <div className="settings-card__heading">
            <span className="settings-card__eyebrow">{t('Preferências')}</span>
            <h1 id="settings-title">{t('Configurações')}</h1>
            <p>{t('Personalize a aparência do BigPeças para tornar a leitura mais confortável.')}</p>
          </div>

          <div className="settings-section">
            <fieldset className="theme-picker">
              <legend>{t('Tema de cores')}</legend>
              <div className="theme-picker__grid">
                {THEME_OPTIONS.map((option) => {
                  const selected = theme === option.id;

                  return (
                    <label
                      key={option.id}
                      className={`theme-option ${selected ? 'theme-option--selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="color-theme"
                        value={option.id}
                        checked={selected}
                        onChange={() => setTheme(option.id)}
                      />
                      <span className="theme-option__content">
                        <span className="theme-option__title-row">
                          <strong>{t(option.name)}</strong>
                          <span className="theme-option__state">
                            {selected ? t('Selecionado') : t('Selecionar')}
                          </span>
                        </span>
                        <span className="theme-option__palette" aria-hidden="true">
                          {option.colors.map((color, colorIndex) => (
                            <span key={`${option.id}-${colorIndex}`} style={{ backgroundColor: color }} />
                          ))}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </div>

          <section className="settings-section accessibility-settings" aria-labelledby="visual-accessibility-title">
            <div className="settings-section__heading">
              <div>
                <span className="settings-card__eyebrow">{t('Acessibilidade')}</span>
                <h2 id="visual-accessibility-title">{t('Acessibilidade visual')}</h2>
              </div>
              <button
                type="button"
                className="btn btn-outline settings-reset"
                onClick={resetPreferences}
                disabled={isDefault}
              >
                {t('Restaurar padrão')}
              </button>
            </div>

            <p className="settings-section__description">
              {t('Recursos pensados para pessoas com baixa visão e dificuldade de distinguir elementos visuais.')}
            </p>

            <fieldset className="text-scale-picker">
              <legend>{t('Tamanho do texto')}</legend>
              <div className="text-scale-picker__grid">
                {TEXT_SCALE_OPTIONS.map((option) => {
                  const selected = preferences.textScale === option.id;

                  return (
                    <label
                      key={option.id}
                      className={`text-scale-option ${selected ? 'text-scale-option--selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="text-scale"
                        value={option.id}
                        checked={selected}
                        onChange={() => setPreferences({ textScale: option.id })}
                      />
                      <span className="text-scale-option__content">
                        <span className={`text-scale-option__sample text-scale-option__sample--${option.id}`} aria-hidden="true">
                          Aa
                        </span>
                        <span>
                          <strong>{t(option.name)}</strong>
                          <small>{t(option.description)}</small>
                        </span>
                        <span className="text-scale-option__state">
                          {selected ? t('Selecionado') : t('Selecionar')}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="accessibility-toggles">
              <label className="accessibility-toggle">
                <input
                  type="checkbox"
                  checked={preferences.readableFont}
                  onChange={(event) => setPreferences({ readableFont: event.target.checked })}
                />
                <span className="accessibility-toggle__content">
                  <strong>{t('Fonte de alta legibilidade')}</strong>
                  <small>{t('Usa fonte sem serifa e aumenta o espaçamento para facilitar a leitura.')}</small>
                </span>
                <span className="accessibility-toggle__state">
                  {preferences.readableFont ? t('Ativado') : t('Desativado')}
                </span>
              </label>

              <label className="accessibility-toggle">
                <input
                  type="checkbox"
                  checked={preferences.emphasizeLinks}
                  onChange={(event) => setPreferences({ emphasizeLinks: event.target.checked })}
                />
                <span className="accessibility-toggle__content">
                  <strong>{t('Sublinhar links')}</strong>
                  <small>{t('Diferencia links do texto comum sem depender somente da cor.')}</small>
                </span>
                <span className="accessibility-toggle__state">
                  {preferences.emphasizeLinks ? t('Ativado') : t('Desativado')}
                </span>
              </label>
            </div>

            <p className="accessibility-summary" aria-live="polite">
              {t('Preferência atual')}: {t(selectedScale.name)} ·{' '}
              {preferences.readableFont ? t('fonte legível ativada') : t('fonte padrão')} ·{' '}
              {preferences.emphasizeLinks ? t('links sublinhados') : t('links padrão')}
            </p>
          </section>

        </section>
      </main>
    </div>
  );
}
