import { createFriendlyError, parseUnexpectedError } from '../../../utils/friendlyErrors';
import { getSupabaseClient } from '../../../services/supabase';
import {
  agruparConversas,
  criarFiltroConversa,
  normalizarTextoMensagem,
  pertenceAConversa,
  pertenceAoUsuario,
} from '../domain/mensagem';

export async function listarMensagensConversa(usuarioAtualId, outroUsuarioId) {
  try {
    const { data, error } = await getSupabaseClient().from('mensagens')
      .select('id, created_at, id_remetente, id_destinatario, mensagem')
      .or(criarFiltroConversa(usuarioAtualId, outroUsuarioId))
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao listar mensagens:', error);
    throw createFriendlyError(parseUnexpectedError(error, 'Nao foi possivel carregar as mensagens desta conversa.'));
  }
}

export async function enviarMensagem({ idRemetente, idDestinatario, mensagem }) {
  try {
    const texto = normalizarTextoMensagem(mensagem);
    const { data, error } = await getSupabaseClient().from('mensagens').insert({
      id_remetente: idRemetente, id_destinatario: idDestinatario, mensagem: texto,
    }).select('id, created_at, id_remetente, id_destinatario, mensagem').single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    throw createFriendlyError(parseUnexpectedError(error, 'Nao foi possivel enviar sua mensagem agora.'));
  }
}

export async function listarConversasAtivas(usuarioAtualId) {
  try {
    const { data, error } = await getSupabaseClient().from('mensagens')
      .select('id, created_at, id_remetente, id_destinatario, mensagem')
      .or(`id_remetente.eq.${usuarioAtualId},id_destinatario.eq.${usuarioAtualId}`)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return agruparConversas(data || [], usuarioAtualId);
  } catch (error) {
    console.error('Erro ao listar conversas ativas:', error);
    throw createFriendlyError(parseUnexpectedError(error, 'Nao foi possivel carregar seus chats agora.'));
  }
}

function assinar({ canal, filtro, onNovaMensagem }) {
  const supabase = getSupabaseClient();
  const channel = supabase.channel(canal).on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'mensagens' },
    (payload) => { if (payload.new && filtro(payload.new)) onNovaMensagem(payload.new); },
  ).subscribe();
  return () => supabase.removeChannel(channel);
}

export const assinarMensagensConversa = ({ usuarioAtualId, outroUsuarioId, onNovaMensagem }) => assinar({
  canal: `mensagens:${usuarioAtualId}:${outroUsuarioId}`,
  filtro: (mensagem) => pertenceAConversa(mensagem, usuarioAtualId, outroUsuarioId),
  onNovaMensagem,
});

export const assinarMensagensUsuario = ({ usuarioAtualId, onNovaMensagem }) => assinar({
  canal: `mensagens-usuario:${usuarioAtualId}`,
  filtro: (mensagem) => pertenceAoUsuario(mensagem, usuarioAtualId),
  onNovaMensagem,
});
