import { formatDateTime } from '../../../utils/intl';

export const OPCOES_DATA_NOTIFICACAO = Object.freeze({
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

// Usa o locale do idioma ativo (ou o informado), nunca um locale fixo.
export function formatarDataNotificacao(valor, locale) {
  return formatDateTime(valor, OPCOES_DATA_NOTIFICACAO, locale);
}
