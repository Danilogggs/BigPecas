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

  if (error || !data?.session?.access_token) {
    throw createFriendlyError('Você precisa estar autenticado para continuar.');
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${data.session.access_token}`,
  };
}

async function request(path, options = {}, fallback) {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/avaliacoes${path}`, {
      ...options,
      headers: { ...headers, ...options.headers },
    });

    if (!response.ok) {
      throw createFriendlyError(await parseErrorResponse(response, fallback));
    }

    return await response.json();
  } catch (error) {
    throw createFriendlyError(parseUnexpectedError(error, fallback));
  }
}

export const buscarAvaliacoesPedido = (pedidoId) =>
  request(`/pedidos/${pedidoId}`, {}, 'Não foi possível carregar as avaliações desta compra.');

export const avaliarFornecedor = (avaliacao) =>
  request('/fornecedores', {
    method: 'POST',
    body: JSON.stringify(avaliacao),
  }, 'Não foi possível registrar a avaliação do vendedor.');

export const avaliarProduto = (avaliacao) =>
  request('/produtos', {
    method: 'POST',
    body: JSON.stringify(avaliacao),
  }, 'Não foi possível registrar a avaliação do produto.');

export const buscarAvaliacoesFornecedor = (fornecedorId) =>
  request(`/fornecedores/${fornecedorId}`, {}, 'Não foi possível carregar as avaliações do vendedor.');

export const buscarAvaliacoesProduto = (pecaId) =>
  request(`/produtos/${pecaId}`, {}, 'Não foi possível carregar as avaliações do produto.');
