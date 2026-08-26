import { getSupabaseClient } from '../../../services/supabase';
import { API_BASE_URL } from '../../../services/apiConfig';
import { createFriendlyError, parseErrorResponse } from '../../../utils/friendlyErrors';
import {
  CEP_ORIGEM_PADRAO,
  criarProdutosFrete,
  formatarCep,
  sanitizarCep,
  validarCep,
  validarCupom,
} from '../domain/frete';

async function headersAutenticados() {
  const { data, error } = await getSupabaseClient().auth.getSession();
  if (error) throw createFriendlyError('Você precisa entrar novamente para continuar.');
  const token = data?.session?.access_token;
  if (!token) throw createFriendlyError('Você precisa estar autenticado para continuar.');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

export async function calcularFrete(cepDestino, itens = []) {
  if (!validarCep(cepDestino)) throw new Error('Informe um CEP válido com 8 dígitos.');
  if (!Array.isArray(itens) || itens.length === 0) {
    throw new Error('Adicione itens ao carrinho antes de calcular o frete.');
  }
  const response = await fetch(`${API_BASE_URL}/frete/calcular`, {
    method: 'POST',
    headers: await headersAutenticados(),
    body: JSON.stringify({
      cep_origem: CEP_ORIGEM_PADRAO,
      cep_destino: sanitizarCep(cepDestino),
      produtos: criarProdutosFrete(itens),
    }),
  });
  if (!response.ok) {
    throw createFriendlyError(await parseErrorResponse(response, 'Não foi possível calcular o frete agora.'));
  }
  const data = await response.json();
  if (!data.opcoes || data.opcoes.length === 0) {
    throw new Error('Nenhuma opção de frete disponível para este CEP.');
  }
  return { cep: formatarCep(cepDestino), cepLimpo: sanitizarCep(cepDestino), opcoes: data.opcoes };
}

export async function aplicarCupom(codigo, subtotal) {
  await new Promise((resolve) => setTimeout(resolve, 400));
  return validarCupom(codigo, subtotal);
}

export { formatarCep, sanitizarCep, validarCep };
