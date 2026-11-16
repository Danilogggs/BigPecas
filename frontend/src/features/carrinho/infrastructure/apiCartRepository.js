import { API_BASE_URL } from '../../../services/apiConfig';
import { getSupabaseClient } from '../../../services/supabase';
import { createFriendlyError, parseErrorResponse } from '../../../utils/friendlyErrors';

async function headersAutenticados() {
  const { data, error } = await getSupabaseClient().auth.getSession();
  const token = data?.session?.access_token;
  if (error || !token) throw createFriendlyError('Você precisa estar autenticado para continuar.');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

async function requisitar(method, mensagem, body) {
  const response = await fetch(`${API_BASE_URL}/carrinho`, {
    method,
    headers: await headersAutenticados(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) throw createFriendlyError(await parseErrorResponse(response, mensagem));
  return response.json();
}

// Carrinho salvo na conta do usuario, para que os itens acompanhem o login
// em qualquer navegador. `atualizado_em` nulo indica que nada foi salvo ainda.
const apiCartRepository = Object.freeze({
  carregar: () => requisitar('GET', 'Não foi possível carregar seu carrinho salvo.'),
  salvar: (itens) => requisitar('PUT', 'Não foi possível salvar seu carrinho.', {
    itens: itens.map(({ id, quantidade }) => ({ id, quantidade })),
  }),
});

export default apiCartRepository;
