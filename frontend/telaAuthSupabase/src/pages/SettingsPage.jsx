import Header from '../components/Header';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

const THEME_OPTIONS = [
  {
    id: 'light',
    name: 'Claro',
    description: 'Fundo claro e a paleta clássica do BigPeças.',
    colors: ['#EDE4CC', '#FFFFFF', '#152218', '#C9A84C'],
  },
  {
    id: 'dark',
    name: 'Escuro',
    description: 'Reduz o brilho e mantém a leitura confortável à noite.',
    colors: ['#101712', '#18221B', '#F4F0E4', '#D4B65E'],
  },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();

  return (
    <div className="settings-page">
      <Header />

      <main className="settings-page__main">
        <section className="settings-card" aria-labelledby="settings-title">
          <div className="settings-card__heading">
            <span className="settings-card__eyebrow">{t('Preferências')}</span>
            <h1 id="settings-title">{t('Configurações')}</h1>
          </div>

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
                      {/* <span className="theme-option__description">{option.description}</span> */}
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

        </section>
      </main>
    </div>
  );
}
