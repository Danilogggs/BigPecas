import { memo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const PecasList = memo(function PecasList({
  pecas,
  filteredPecas,
  pecasSearchQuery,
  setPecasSearchQuery,
  selectedPecaId,
  onSelectPeca,
}) {
  const { t } = useLanguage();
  return (
    <div className="pecas-list-container">
      <div className="pecas-list-header">
        <h2>{t('yourParts')} ({filteredPecas.length})</h2>
        <input
          type="text"
          placeholder={t('searchByNameSku')}
          value={pecasSearchQuery}
          onChange={(e) => setPecasSearchQuery(e.target.value)}
          className="form-input"
        />
      </div>

      <div className="pecas-list-content">
        {filteredPecas.length === 0 ? (
          <div className="pecas-list-empty">
            {pecas.length === 0
              ? t('noPartsRegistered')
              : t('noPartsCriteria')}
          </div>
        ) : (
          filteredPecas.map((peca) => (
            <div
              key={peca.id}
              onClick={() => onSelectPeca(peca.id)}
              className={`peca-item ${selectedPecaId === peca.id ? 'active' : ''}`}
            >
              <div className="peca-item-nome">{peca.nome_peca}</div>
              <div className="peca-item-sku">{t('sku', { value: peca.sku })}</div>
              <div className="peca-item-preco">
                R$ {typeof peca.preco === 'number' ? peca.preco.toFixed(2) : peca.preco}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});

export default PecasList;
