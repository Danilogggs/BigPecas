import { getSupabaseClient } from '../../../services/supabase';
import { API_BASE_URL } from '../../../services/apiConfig';
import { createFriendlyError, parseErrorResponse, parseUnexpectedError } from '../../../utils/friendlyErrors';

async function headersAutenticados() {
  const { data, error } = await getSupabaseClient().auth.getSession();
  if (error) throw createFriendlyError('Você precisa entrar novamente para continuar.');
  const token = data?.session?.access_token;
  if (!token) throw createFriendlyError('Você precisa estar autenticado para continuar.');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function requisitar(caminho, { method = 'GET', mensagem }) {
  try {
    const response = await fetch(`${API_BASE_URL}/notificacoes${caminho}`, {
      method, headers: await headersAutenticados(),
    });
    if (!response.ok) throw createFriendlyError(await parseErrorResponse(response, mensagem));
    return response.json();
  } catch (error) {
    throw createFriendlyError(parseUnexpectedError(error, mensagem));
  }
}

export async function buscarContagemNotificacoesNaoLidas() {
  const data = await requisitar('/nao-lidas/count', {
    mensagem: 'Não foi possível carregar suas notificações no momento.',
  });
  return Number(data?.count || 0);
}

export async function listarNotificacoes() {
  const data = await requisitar('', { mensagem: 'Não foi possível carregar suas notificações.' });
  return data?.notificacoes || [];
}

export const marcarNotificacaoComoLida = (id) => requisitar(`/${id}/lida`, {
  method: 'PATCH', mensagem: 'Não foi possível atualizar a notificação.',
});
