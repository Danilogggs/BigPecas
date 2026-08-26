import { useLanguage } from '../../../contexts/LanguageContext';
import { obterMetaStatus } from './pedidoPresentation';

export default function StatusBadge({ status }) {
  const { t } = useLanguage();
  const meta = obterMetaStatus(status, t);

  return (
    <span
      className="status-badge"
      style={{ color: meta.color, backgroundColor: meta.bg, borderColor: meta.border }}
    >
      <span>{meta.icone}</span> {meta.label}
    </span>
  );
}
