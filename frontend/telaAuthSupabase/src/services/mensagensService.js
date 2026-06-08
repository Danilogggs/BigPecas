import { createFriendlyError, parseUnexpectedError } from '../utils/friendlyErrors';
import { getSupabaseClient } from './supabase';

function getParConversa(usuarioAtualId, outroUsuarioId) {
  return {
    remetenteA: usuarioAtualId,
    destinatarioA: outroUsuarioId,
    remetenteB: outroUsuarioId,
    destinatarioB: usuarioAtualId,
  };
}

export async function listarMensagensConversa(usuarioAtualId, outroUsuarioId) {
  try {
    const supabase = getSupabaseClient();
    const { remetenteA, destinatarioA, remetenteB, destinatarioB } = getParConversa(
      usuarioAtualId,
      outroUsuarioId
    );

    const { data, error } = await supabase
      .from('mensagens')
      .select('id, created_at, id_remetente, id_destinatario, mensagem')
      .or(
        `and(id_remetente.eq.${remetenteA},id_destinatario.eq.${destinatarioA}),and(id_remetente.eq.${remetenteB},id_destinatario.eq.${destinatarioB})`
      )
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Erro ao listar mensagens:', error);
    throw createFriendlyError(
      parseUnexpectedError(error, 'Nao foi possivel carregar as mensagens desta conversa.')
    );
  }
}

export async function enviarMensagem({ idRemetente, idDestinatario, mensagem }) {
  try {
    const texto = mensagem.trim();

    if (!texto) {
      throw createFriendlyError('Digite uma mensagem antes de enviar.');
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('mensagens')
      .insert({
        id_remetente: idRemetente,
        id_destinatario: idDestinatario,
        mensagem: texto,
      })
      .select('id, created_at, id_remetente, id_destinatario, mensagem')
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    throw createFriendlyError(parseUnexpectedError(error, 'Nao foi possivel enviar sua mensagem agora.'));
  }
}

export async function listarConversasAtivas(usuarioAtualId) {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('mensagens')
      .select('id, created_at, id_remetente, id_destinatario, mensagem')
      .or(`id_remetente.eq.${usuarioAtualId},id_destinatario.eq.${usuarioAtualId}`)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const conversasPorUsuario = new Map();

    (data || []).forEach((mensagem) => {
      const outroUsuarioId =
        String(mensagem.id_remetente) === String(usuarioAtualId)
          ? mensagem.id_destinatario
          : mensagem.id_remetente;

      if (!conversasPorUsuario.has(String(outroUsuarioId))) {
        conversasPorUsuario.set(String(outroUsuarioId), {
          outroUsuarioId,
          ultimaMensagem: mensagem,
        });
      }
    });

    return Array.from(conversasPorUsuario.values());
  } catch (error) {
    console.error('Erro ao listar conversas ativas:', error);
    throw createFriendlyError(parseUnexpectedError(error, 'Nao foi possivel carregar seus chats agora.'));
  }
}

export function assinarMensagensConversa({ usuarioAtualId, outroUsuarioId, onNovaMensagem }) {
  const supabase = getSupabaseClient();

  const pertenceAConversa = (mensagem) => {
    const remetente = String(mensagem.id_remetente);
    const destinatario = String(mensagem.id_destinatario);
    const usuarioAtual = String(usuarioAtualId);
    const outroUsuario = String(outroUsuarioId);
    const enviada = remetente === usuarioAtual && destinatario === outroUsuario;
    const recebida = remetente === outroUsuario && destinatario === usuarioAtual;
    return enviada || recebida;
  };

  const channel = supabase
    .channel(`mensagens:${usuarioAtualId}:${outroUsuarioId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'mensagens',
      },
      (payload) => {
        if (payload.new && pertenceAConversa(payload.new)) {
          onNovaMensagem(payload.new);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function assinarMensagensUsuario({ usuarioAtualId, onNovaMensagem }) {
  const supabase = getSupabaseClient();

  const pertenceAoUsuario = (mensagem) => {
    const usuarioAtual = String(usuarioAtualId);
    return String(mensagem.id_remetente) === usuarioAtual || String(mensagem.id_destinatario) === usuarioAtual;
  };

  const channel = supabase
    .channel(`mensagens-usuario:${usuarioAtualId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'mensagens',
      },
      (payload) => {
        if (payload.new && pertenceAoUsuario(payload.new)) {
          onNovaMensagem(payload.new);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
