import { useLanguage } from '../contexts/LanguageContext';
import { chaveCondicaoPeca } from '../features/pecas/presentation/pecaPresentation';

// Rotulo traduzido da condicao. "NOS" nao e obvio para quem compra, entao
// ganha uma explicacao que abre com mouse, teclado ou toque.
export default function CondicaoPeca({ condicao, alinharFim = false }) {
  const { t } = useLanguage();
  const chave = chaveCondicaoPeca(condicao);

  return (
    <>
      {t(chave)}
      {chave === 'conditionNos' && (
        <span
          className={`bp-tooltip ${alinharFim ? 'bp-tooltip--end' : ''}`}
          tabIndex={0}
          role="button"
          aria-label={t('nosExplanation')}
          onClick={(event) => { event.preventDefault(); event.stopPropagation(); }}
        >
          <span aria-hidden="true" className="bp-tooltip__icon">i</span>
          <span role="tooltip" className="bp-tooltip__text">{t('nosExplanation')}</span>
        </span>
      )}
    </>
  );
}
