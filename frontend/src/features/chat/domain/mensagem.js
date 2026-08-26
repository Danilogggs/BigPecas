import { createFriendlyError } from '../../../utils/friendlyErrors';

export function criarFiltroConversa(usuarioAtualId, outroUsuarioId) {
  return `and(id_remetente.eq.${usuarioAtualId},id_destinatario.eq.${outroUsuarioId}),and(id_remetente.eq.${outroUsuarioId},id_destinatario.eq.${usuarioAtualId})`;
}

export function pertenceAConversa(mensagem, usuarioAtualId, outroUsuarioId) {
  const remetente = String(mensagem.id_remetente);
  const destinatario = String(mensagem.id_destinatario);
  const atual = String(usuarioAtualId);
  const outro = String(outroUsuarioId);
  return (remetente === atual && destinatario === outro)
    || (remetente === outro && destinatario === atual);
}

export function pertenceAoUsuario(mensagem, usuarioAtualId) {
  const atual = String(usuarioAtualId);
  return String(mensagem.id_remetente) === atual || String(mensagem.id_destinatario) === atual;
}

export function normalizarTextoMensagem(mensagem) {
  const texto = mensagem.trim();
  if (!texto) throw createFriendlyError('Digite uma mensagem antes de enviar.');
  return texto;
}

export function agruparConversas(mensagens = [], usuarioAtualId) {
  const conversas = new Map();
  mensagens.forEach((mensagem) => {
    const outroUsuarioId = String(mensagem.id_remetente) === String(usuarioAtualId)
      ? mensagem.id_destinatario : mensagem.id_remetente;
    if (!conversas.has(String(outroUsuarioId))) {
      conversas.set(String(outroUsuarioId), { outroUsuarioId, ultimaMensagem: mensagem });
    }
  });
  return Array.from(conversas.values());
}

export function adicionarMensagemSemDuplicar(mensagens, novaMensagem, ordenar = false) {
  if (mensagens.some((mensagem) => mensagem.id === novaMensagem.id)) return mensagens;
  const atualizadas = [...mensagens, novaMensagem];
  return ordenar
    ? atualizadas.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    : atualizadas;
}

export const nomeParticipante = (usuario) => (
  usuario?.nome_loja || usuario?.full_name || usuario?.nome || usuario?.email || 'Usuario'
);
