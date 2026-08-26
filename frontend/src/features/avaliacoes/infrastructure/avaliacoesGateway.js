import { getSupabaseClient } from '../../../services/supabase';
import { API_BASE_URL } from '../../../services/apiConfig';
import { createFriendlyError, parseErrorResponse, parseUnexpectedError } from '../../../utils/friendlyErrors';

async function headersAutenticados() {
  const { data, error } = await getSupabaseClient().auth.getSession();
  if (error || !data?.session?.access_token) {
    throw createFriendlyError('Você precisa estar autenticado para continuar.');
  }
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` };
}

async function requisitar(path, options = {}, fallback) {
  try {
    const response = await fetch(`${API_BASE_URL}/avaliacoes${path}`, {
      ...options,
      headers: { ...await headersAutenticados(), ...options.headers },
    });
    if (!response.ok) throw createFriendlyError(await parseErrorResponse(response, fallback));
    return response.json();
  } catch (error) {
    throw createFriendlyError(parseUnexpectedError(error, fallback));
  }
}

export const buscarAvaliacoesPedido = (pedidoId) => requisitar(
  `/pedidos/${pedidoId}`, {}, 'Não foi possível carregar as avaliações desta compra.',
);
export const avaliarFornecedor = (avaliacao) => requisitar('/fornecedores', {
  method: 'POST', body: JSON.stringify(avaliacao),
}, 'Não foi possível registrar a avaliação do vendedor.');
export const avaliarProduto = (avaliacao) => requisitar('/produtos', {
  method: 'POST', body: JSON.stringify(avaliacao),
}, 'Não foi possível registrar a avaliação do produto.');
export const buscarAvaliacoesFornecedor = (id) => requisitar(
  `/fornecedores/${id}`, {}, 'Não foi possível carregar as avaliações do vendedor.',
);
export const buscarAvaliacoesProduto = (id) => requisitar(
  `/produtos/${id}`, {}, 'Não foi possível carregar as avaliações do produto.',
);
