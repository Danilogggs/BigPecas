import {
  createFriendlyError,
  FRIENDLY_DEFAULT_MESSAGES,
  parseErrorResponse,
  parseUnexpectedError,
} from '../utils/friendlyErrors';

const API_BASE_URL = import.meta.env.VITE_PECAS_API_URL || 'http://localhost:3002/api';

export const listarPecas = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/pecas`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const message = await parseErrorResponse(response, FRIENDLY_DEFAULT_MESSAGES.list);
      throw createFriendlyError(message);
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao listar peças:', error);
    throw createFriendlyError(parseUnexpectedError(error, FRIENDLY_DEFAULT_MESSAGES.list));
  }
};

/**
 * Cadastra uma nova peça no banco de dados
 * @param {Object} pecaData - Dados da peça com campos: nome_peca, sku, oem_number, num_serie,
 * categoria, material, condicao, peso_gramas, comprimento_mm, largura_mm, altura_mm,
 * detalhes_gravacao, historico_proveniencia, preco, estoque_atual
 */
export const cadastrarPeca = async (pecaData) => {
  try {
    console.log('=== INICIANDO CADASTRO ===');
    console.log('Dados recebidos do formulário:', pecaData);

    const dadosMapeados = {
      ...pecaData,
      categoria_id: pecaData.categoria ? parseInt(pecaData.categoria, 10) : null,
      material_id: pecaData.material ? parseInt(pecaData.material, 10) : null,
    };

    delete dadosMapeados.categoria;
    delete dadosMapeados.material;

    console.log('Dados após mapeamento:', dadosMapeados);
    console.log('JSON que será enviado:', JSON.stringify(dadosMapeados, null, 2));

    const response = await fetch(`${API_BASE_URL}/pecas/cadastrar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dadosMapeados),
    });

    console.log('Status da resposta:', response.status);

    if (!response.ok) {
      const message = await parseErrorResponse(response, FRIENDLY_DEFAULT_MESSAGES.create);
      throw createFriendlyError(message);
    }

    const data = await response.json();
    console.log('Peça cadastrada com sucesso:', data);
    return data;
  } catch (error) {
    console.error('Erro ao cadastrar peça:', error);
    throw createFriendlyError(parseUnexpectedError(error, FRIENDLY_DEFAULT_MESSAGES.create));
  }
};

/**
 * Busca uma peça pelo ID
 * @param {number} id - ID da peça
 */
export const buscarPecaPorId = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/pecas/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
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

/**
 * Atualiza uma peça existente
 * @param {number} id - ID da peça
 * @param {Object} pecaData - Dados a atualizar
 */
export const atualizarPeca = async (id, pecaData) => {
  try {
    const dadosFiltrados = Object.fromEntries(
      Object.entries(pecaData).filter(([_, value]) => value !== '' && value !== null)
    );

    const response = await fetch(`${API_BASE_URL}/pecas/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
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

/**
 * Deleta uma peça
 * @param {number} id - ID da peça
 */
export const deletarPeca = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/pecas/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
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
