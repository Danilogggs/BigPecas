import { getSupabaseClient } from './supabase';
import {
  createFriendlyError,
  parseErrorResponse,
  parseUnexpectedError,
} from '../utils/friendlyErrors';

const API_BASE_URL = import.meta.env.VITE_PECAS_API_URL || 'http://localhost:3002/api';

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

export const listarPedidos = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/pedidos`, { headers });

    if (!response.ok) {
      const message = await parseErrorResponse(response, 'Não foi possível carregar seus pedidos.');
      throw createFriendlyError(message);
    }

    return await response.json();
  } catch (error) {
    throw createFriendlyError(parseUnexpectedError(error, 'Não foi possível carregar seus pedidos.'));
  }
};

export const buscarPedidoPorId = async (id) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/pedidos/${id}`, { headers });

    if (!response.ok) {
      const message = await parseErrorResponse(response, 'Pedido não encontrado.');
      throw createFriendlyError(message);
    }

    return await response.json();
  } catch (error) {
    throw createFriendlyError(parseUnexpectedError(error, 'Não foi possível carregar o pedido.'));
  }
};

export const criarPedidoAPI = async (dadosPedido) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/pedidos`, {
      method: 'POST',
      headers,
      body: JSON.stringify(dadosPedido),
    });

    if (!response.ok) {
      const message = await parseErrorResponse(response, 'Não foi possível criar o pedido.');
      throw createFriendlyError(message);
    }

    return await response.json();
  } catch (error) {
    throw createFriendlyError(parseUnexpectedError(error, 'Não foi possível criar o pedido.'));
  }
};

export const atualizarStatusPedidoAPI = async (id, status) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/pedidos/${id}/status`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const message = await parseErrorResponse(response, 'Não foi possível atualizar o status.');
      throw createFriendlyError(message);
    }

    return await response.json();
  } catch (error) {
    throw createFriendlyError(parseUnexpectedError(error, 'Não foi possível atualizar o status.'));
  }
};
