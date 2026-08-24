import { LANGUAGES, useLanguage } from '../contexts/LanguageContext';

export default function LanguageSwitcher({ className = '' }) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <label className={`bp-language-switcher ${className}`} title={t('language')}>
      <span className="sr-only">{t('language')}</span>
      <select value={language} onChange={(event) => setLanguage(event.target.value)} aria-label={t('language')}>
        {Object.values(LANGUAGES).map((code) => <option key={code} value={code}>{code}</option>)}
      </select>
    </label>
  );
}
