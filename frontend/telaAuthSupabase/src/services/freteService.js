import { getSupabaseClient } from './supabase';
import { API_BASE_URL } from './apiConfig';
import { createFriendlyError, parseErrorResponse, parseUnexpectedError } from '../utils/friendlyErrors';

// CEP de origem fixo do vendedor/armazém (pode vir do perfil do vendedor futuramente)
const CEP_ORIGEM_PADRAO = '01310100'; // São Paulo - SP

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

export function sanitizarCep(cep = '') {
  return String(cep).replace(/\D/g, '').slice(0, 8);
}

export function formatarCep(cep = '') {
  const limpo = sanitizarCep(cep);
  if (limpo.length <= 5) return limpo;
  return `${limpo.slice(0, 5)}-${limpo.slice(5)}`;
}

export function validarCep(cep = '') {
  return sanitizarCep(cep).length === 8;
}

/**
 * Calcula frete via Melhor Envio (sandbox) através do backend.
 * @param {string} cepDestino - CEP do comprador
 * @param {Array} itens - itens do carrinho
 * @returns {Promise<{opcoes, cep, cepLimpo}>}
 */
export async function calcularFrete(cepDestino, itens = []) {
  if (!validarCep(cepDestino)) {
    throw new Error('Informe um CEP válido com 8 dígitos.');
  }

  if (!Array.isArray(itens) || itens.length === 0) {
    throw new Error('Adicione itens ao carrinho antes de calcular o frete.');
  }

  const headers = await getAuthHeaders();

  const produtos = itens.map((item) => ({
    id: item.id,
    peso_gramas: Number(item.peso_gramas) || 1000,
    comprimento_mm: Number(item.comprimento_mm) || 200,
    largura_mm: Number(item.largura_mm) || 150,
    altura_mm: Number(item.altura_mm) || 100,
    preco: Number(item.preco) || 0,
    quantidade: Number(item.quantidade) || 1,
  }));

  const response = await fetch(`${API_BASE_URL}/frete/calcular`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      cep_origem: CEP_ORIGEM_PADRAO,
      cep_destino: sanitizarCep(cepDestino),
      produtos,
    }),
  });

  if (!response.ok) {
    const message = await parseErrorResponse(response, 'Não foi possível calcular o frete agora.');
    throw createFriendlyError(message);
  }

  const data = await response.json();

  if (!data.opcoes || data.opcoes.length === 0) {
    throw new Error('Nenhuma opção de frete disponível para este CEP.');
  }

  return {
    cep: formatarCep(cepDestino),
    cepLimpo: sanitizarCep(cepDestino),
    opcoes: data.opcoes,
  };
}

/**
 * Aplica cupom de desconto (mock local — sem API externa).
 * Cupons: BIGPECAS10 (10% OFF), FRETE0 (frete grátis), PRIMEIRA20 (20% OFF min R$200)
 */
export async function aplicarCupom(codigo, subtotal) {
  await new Promise((resolve) => setTimeout(resolve, 400));

  const cupom = String(codigo || '').trim().toUpperCase();

  const cupons = {
    BIGPECAS10: { tipo: 'percentual', valor: 0.1, descricao: '10% OFF no subtotal' },
    FRETE0: { tipo: 'frete_gratis', valor: 1.0, descricao: 'Frete grátis' },
    PRIMEIRA20: { tipo: 'percentual', valor: 0.2, descricao: '20% OFF na primeira compra', minimo: 200 },
  };

  const aplicacao = cupons[cupom];
  if (!aplicacao) throw new Error('Cupom inválido ou expirado.');
  if (aplicacao.minimo && subtotal < aplicacao.minimo) {
    throw new Error(`Subtotal mínimo de R$ ${aplicacao.minimo.toFixed(2)} para usar este cupom.`);
  }

  return { codigo: cupom, ...aplicacao };
}
