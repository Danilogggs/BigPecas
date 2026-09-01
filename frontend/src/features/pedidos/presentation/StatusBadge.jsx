import { useLanguage } from '../../../contexts/LanguageContext';
import { obterMetaStatus } from './pedidoPresentation';
import { AppIcon } from '../../../components/Icons';

export default function StatusBadge({ status }) {
  const { t } = useLanguage();
  const meta = obterMetaStatus(status, t);

  return (
    <span
      className="status-badge"
      style={{ color: meta.color, backgroundColor: meta.bg, borderColor: meta.border }}
    >
      <span><AppIcon name={meta.icone} size={14} /></span> {meta.label}
    </span>
  );
}
