import { useLanguage } from '../contexts/LanguageContext';

const statuses = {
  pendente_validacao: ['Aguardando avaliação', 'Sua peça será exibida no catálogo após a aprovação.'],
  publicada: ['Publicada', 'Sua peça está aprovada para aparecer no catálogo.'],
  rejeitada: ['Rejeitada', 'Revise o motivo da rejeição e atualize os dados da peça.'],
  arquivada: ['Arquivada', 'Esta peça não está disponível no catálogo.'],
};

export default function PartReviewStatus({ status, reason }) {
  const { t } = useLanguage();
  if (!status) return null;
  const [label, description] = statuses[status] || ['Status indisponível', 'Atualize a página para consultar a situação da peça.'];
  return (
    <div role="status" style={{ margin: '0 0 24px', padding: '16px 20px',
      border: '1px solid var(--bp-border)', borderLeft: '4px solid var(--bp-text-muted)',
      borderRadius: 12, background: 'var(--bp-surface)', color: 'var(--bp-text)',
      lineHeight: 1.5, overflowWrap: 'anywhere' }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--bp-text-muted)', marginBottom: 4 }}>{t('Situação do anúncio')}</div>
      <strong>{t(label)}</strong>
      <p style={{ margin: '4px 0 0', fontSize: '0.875rem' }}>{t(description)}</p>
      {reason && <p style={{ margin: '8px 0 0' }}><strong>{t('Motivo da rejeição')}: </strong>{reason}</p>}
    </div>
  );
}
