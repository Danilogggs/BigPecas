import { getSupabaseClient } from './supabase';
import { API_BASE_URL } from './apiConfig';
import { createFriendlyError, parseErrorResponse, parseUnexpectedError } from '../utils/friendlyErrors';

async function getAuthHeaders() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();

  if (error) throw createFriendlyError('Você precisa entrar novamente para continuar.');

  const token = data?.session?.access_token;
  if (!token) throw createFriendlyError('Você precisa estar autenticado para continuar.');

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function buscarContagemNotificacoesNaoLidas() {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/notificacoes/nao-lidas/count`, { headers });

    if (!response.ok) {
      const message = await parseErrorResponse(
        response,
        'Não foi possível carregar suas notificações no momento.',
      );
      throw createFriendlyError(message);
    }

    const data = await response.json();
    return Number(data?.count || 0);
  } catch (error) {
    throw createFriendlyError(
      parseUnexpectedError(error, 'Não foi possível carregar suas notificações no momento.'),
    );
  }
}

export async function listarNotificacoes() {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/notificacoes`, { headers });

    if (!response.ok) {
      const message = await parseErrorResponse(
        response,
        'Não foi possível carregar suas notificações.',
      );
      throw createFriendlyError(message);
    }

    const data = await response.json();
    return data?.notificacoes || [];
  } catch (error) {
    throw createFriendlyError(parseUnexpectedError(error, 'Não foi possível carregar suas notificações.'));
  }
}

export async function marcarNotificacaoComoLida(id) {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/notificacoes/${id}/lida`, {
      method: 'PATCH',
      headers,
    });

    if (!response.ok) {
      const message = await parseErrorResponse(
        response,
        'Não foi possível atualizar a notificação.',
      );
      throw createFriendlyError(message);
    }

    return await response.json();
  } catch (error) {
    throw createFriendlyError(parseUnexpectedError(error, 'Não foi possível atualizar a notificação.'));
  }
}
