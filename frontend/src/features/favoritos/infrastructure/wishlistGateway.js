import { API_BASE_URL } from '../../../services/apiConfig';
import { getSupabaseClient } from '../../../services/supabase';
import {
  createFriendlyError,
  parseErrorResponse,
  parseUnexpectedError,
} from '../../../utils/friendlyErrors';

async function headersAutenticados() {
  const { data, error } = await getSupabaseClient().auth.getSession();
  if (error) throw createFriendlyError('Você precisa entrar novamente para continuar.');
  const token = data?.session?.access_token;
  if (!token) throw createFriendlyError('Você precisa estar autenticado para continuar.');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function requisitar(caminho, method, mensagem, contexto) {
  try {
    const response = await fetch(`${API_BASE_URL}/wish${caminho}`, {
      method,
      headers: await headersAutenticados(),
    });
    if (!response.ok) throw createFriendlyError(await parseErrorResponse(response, mensagem));
    return response.json();
  } catch (error) {
    console.error(contexto, error);
    throw createFriendlyError(parseUnexpectedError(error, mensagem));
  }
}

export const listarWish = () => requisitar(
  '', 'GET', 'Não foi possível carregar sua lista de desejos agora.',
  'Erro ao listar lista de desejos:',
);
export const buscarStatusWish = (pecaId) => requisitar(
  `/status/${pecaId}`, 'GET', 'Não foi possível verificar a lista de desejos agora.',
  'Erro ao verificar status da lista de desejos:',
);
export const adicionarPecaWish = (pecaId) => requisitar(
  `/${pecaId}`, 'POST', 'Não foi possível adicionar a peça à lista de desejos.',
  'Erro ao adicionar peça à lista de desejos:',
);
export const removerPecaWish = (pecaId) => requisitar(
  `/${pecaId}`, 'DELETE', 'Não foi possível remover a peça da lista de desejos.',
  'Erro ao remover peça da lista de desejos:',
);

export default { adicionarPecaWish, buscarStatusWish, listarWish, removerPecaWish };
