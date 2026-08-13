import { getSupabaseClient } from './supabase';
import { API_BASE_URL } from './apiConfig';
import {
  createFriendlyError,
  parseErrorResponse,
  parseUnexpectedError,
} from '../utils/friendlyErrors';

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

export const listarHistoricoPedidos = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/pedidos/historico`, { headers });

    if (!response.ok) {
      const message = await parseErrorResponse(
        response,
        'Não foi possível carregar o histórico de compras e vendas.',
      );
      throw createFriendlyError(message);
    }

    return await response.json();
  } catch (error) {
    throw createFriendlyError(
      parseUnexpectedError(error, 'Não foi possível carregar o histórico de compras e vendas.'),
    );
  }
};

export const buscarPedidoPorId = async (id, visao = 'compra') => {
  try {
    const headers = await getAuthHeaders();
    const query = visao === 'venda' ? '?visao=venda' : '';
    const response = await fetch(`${API_BASE_URL}/pedidos/${id}${query}`, { headers });

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
