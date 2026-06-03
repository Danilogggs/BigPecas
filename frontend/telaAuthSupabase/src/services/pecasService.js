import {
  createFriendlyError,
  FRIENDLY_DEFAULT_MESSAGES,
  parseErrorResponse,
  parseUnexpectedError,
} from '../utils/friendlyErrors';
import { getSupabaseClient } from './supabase';

const API_BASE_URL = import.meta.env.VITE_PECAS_API_URL || 'http://localhost:3002/api';

async function getAuthHeaders() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw createFriendlyError('Você precisa entrar novamente para continuar.');
  }

  const token = data?.session?.access_token;

  if (!token) {
    throw createFriendlyError('Você precisa estar autenticado para continuar.');
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

function buildQuery(params = {}) {
  return new URLSearchParams(
    Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined)
    )
  ).toString();
}

export const listarPecas = async (params = {}) => {
  try {
    const headers = await getAuthHeaders();
    const query = buildQuery(params);
    const url = query ? `${API_BASE_URL}/pecas?${query}` : `${API_BASE_URL}/pecas`;

    const response = await fetch(url, { method: 'GET', headers });

    if (!response.ok) {
      const message = await parseErrorResponse(response, FRIENDLY_DEFAULT_MESSAGES.list);
      throw createFriendlyError(message);
    }

    const data = await response.json();

    // Expõe metadados de paginação junto com os dados
    const total = Number(response.headers.get('X-Total-Count') ?? data.length);
    const page  = Number(response.headers.get('X-Page') ?? 1);
    const pageSize = Number(response.headers.get('X-Page-Size') ?? data.length);

    return { data, total, page, pageSize, hasMore: page * pageSize < total };
  } catch (error) {
    throw createFriendlyError(parseUnexpectedError(error, FRIENDLY_DEFAULT_MESSAGES.list));
  }
};

export const listarMinhasPecas = async (params = {}) => {
  try {
    const headers = await getAuthHeaders();
    const queryParams = { ...params, minhas_pecas: 'true' };
    const query = buildQuery(queryParams);
    const url = query ? `${API_BASE_URL}/pecas?${query}` : `${API_BASE_URL}/pecas?minhas_pecas=true`;

    const response = await fetch(url, { method: 'GET', headers });

    if (!response.ok) {
      const message = await parseErrorResponse(response, FRIENDLY_DEFAULT_MESSAGES.list);
      throw createFriendlyError(message);
    }

    const data = await response.json();
    const total = Number(response.headers.get('X-Total-Count') ?? data.length);
    const page  = Number(response.headers.get('X-Page') ?? 1);
    const pageSize = Number(response.headers.get('X-Page-Size') ?? data.length);

    return { data, total, page, pageSize, hasMore: page * pageSize < total };
  } catch (error) {
    throw createFriendlyError(parseUnexpectedError(error, FRIENDLY_DEFAULT_MESSAGES.list));
  }
};

export const listarCategorias = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/categorias`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const message = await parseErrorResponse(response, 'Não foi possível carregar as categorias agora.');
      throw createFriendlyError(message);
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao listar categorias:', error);
    throw createFriendlyError(parseUnexpectedError(error, 'Não foi possível carregar as categorias agora.'));
  }
};

export const listarMateriais = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/materiais`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const message = await parseErrorResponse(response, 'Não foi possível carregar os materiais agora.');
      throw createFriendlyError(message);
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao listar materiais:', error);
    throw createFriendlyError(parseUnexpectedError(error, 'Não foi possível carregar os materiais agora.'));
  }
};

export const cadastrarPeca = async (pecaData) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/pecas/cadastrar`, {
      method: 'POST',
      headers,
      body: JSON.stringify(pecaData),
    });

    if (!response.ok) {
      const message = await parseErrorResponse(response, FRIENDLY_DEFAULT_MESSAGES.create);
      throw createFriendlyError(message);
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao cadastrar peça:', error);
    throw createFriendlyError(parseUnexpectedError(error, FRIENDLY_DEFAULT_MESSAGES.create));
  }
};

export const buscarPecaPorId = async (id) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/pecas/${id}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const message = await parseErrorResponse(response, 'Não foi possível localizar a peça solicitada.');
      throw createFriendlyError(message);
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar peça:', error);
    throw createFriendlyError(parseUnexpectedError(error, 'Não foi possível localizar a peça solicitada.'));
  }
};

export const atualizarPeca = async (id, pecaData) => {
  try {
    const headers = await getAuthHeaders();
    const dadosFiltrados = Object.fromEntries(
      Object.entries(pecaData).filter(([, value]) => value !== '' && value !== null && value !== undefined)
    );

    const response = await fetch(`${API_BASE_URL}/pecas/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(dadosFiltrados),
    });

    if (!response.ok) {
      const message = await parseErrorResponse(response, FRIENDLY_DEFAULT_MESSAGES.update);
      throw createFriendlyError(message);
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao atualizar peça:', error);
    throw createFriendlyError(parseUnexpectedError(error, FRIENDLY_DEFAULT_MESSAGES.update));
  }
};

export const deletarPeca = async (id) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/pecas/${id}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      const message = await parseErrorResponse(response, FRIENDLY_DEFAULT_MESSAGES.delete);
      throw createFriendlyError(message);
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao deletar peça:', error);
    throw createFriendlyError(parseUnexpectedError(error, FRIENDLY_DEFAULT_MESSAGES.delete));
  }
};

export const listarWish = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/wish`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const message = await parseErrorResponse(response, 'Não foi possível carregar sua lista de desejos agora.');
      throw createFriendlyError(message);
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao listar lista de desejos:', error);
    throw createFriendlyError(parseUnexpectedError(error, 'Não foi possível carregar sua lista de desejos agora.'));
  }
};

export const buscarStatusWish = async (pecaId) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/wish/status/${pecaId}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const message = await parseErrorResponse(response, 'Não foi possível verificar a lista de desejos agora.');
      throw createFriendlyError(message);
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao verificar status da lista de desejos:', error);
    throw createFriendlyError(parseUnexpectedError(error, 'Não foi possível verificar a lista de desejos agora.'));
  }
};

export const adicionarPecaWish = async (pecaId) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/wish/${pecaId}`, {
      method: 'POST',
      headers,
    });

    if (!response.ok) {
      const message = await parseErrorResponse(response, 'Não foi possível adicionar a peça à lista de desejos.');
      throw createFriendlyError(message);
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao adicionar peça à lista de desejos:', error);
    throw createFriendlyError(parseUnexpectedError(error, 'Não foi possível adicionar a peça à lista de desejos.'));
  }
};

export const removerPecaWish = async (pecaId) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/wish/${pecaId}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      const message = await parseErrorResponse(response, 'Não foi possível remover a peça da lista de desejos.');
      throw createFriendlyError(message);
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao remover peça da lista de desejos:', error);
    throw createFriendlyError(parseUnexpectedError(error, 'Não foi possível remover a peça da lista de desejos.'));
  }
};

export const buscarRecomendacoesPorPeca = async (id, limite = 4) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/pecas/${id}/recomendacoes?limite=${limite}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const message = await parseErrorResponse(
        response,
        'Não foi possível carregar recomendações para esta peça.'
      );
      throw createFriendlyError(message);
    }

    const data = await response.json();
    return data?.recomendacoes || [];
  } catch (error) {
    console.error('Erro ao buscar recomendações:', error);
    throw createFriendlyError(
      parseUnexpectedError(error, 'Não foi possível carregar recomendações para esta peça.')
    );
  }
};

export const buscarFornecedoresRecomendados = async (limite = 4) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/pecas/fornecedores/recomendados?limite=${limite}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const message = await parseErrorResponse(
        response,
        'Não foi possível carregar fornecedores recomendados agora.'
      );
      throw createFriendlyError(message);
    }

    const data = await response.json();
    return data?.fornecedores || [];
  } catch (error) {
    console.error('Erro ao buscar fornecedores recomendados:', error);
    throw createFriendlyError(
      parseUnexpectedError(error, 'Não foi possível carregar fornecedores recomendados agora.')
    );
  }
};

export const buscarPerfilFornecedor = async (id) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/pecas/fornecedores/${id}/perfil`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const message = await parseErrorResponse(
        response,
        'Não foi possível carregar o perfil do vendedor agora.'
      );
      throw createFriendlyError(message);
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar perfil do fornecedor:', error);
    throw createFriendlyError(
      parseUnexpectedError(error, 'Não foi possível carregar o perfil do vendedor agora.')
    );
  }
};