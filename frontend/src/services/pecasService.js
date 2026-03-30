const API_BASE_URL = import.meta.env.VITE_PECAS_API_URL || 'http://localhost:3002/api';

export const listarPecas = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/pecas`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Erro ao buscar peças: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao listar peças:', error);
    throw error;
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

    // Mapeia categoria e material para IDs (será integrado com backend depois)
    const dadosMapeados = {
      ...pecaData,
      categoria_id: pecaData.categoria ? parseInt(pecaData.categoria) : null,
      material_id: pecaData.material ? parseInt(pecaData.material) : null
    };

    // Remove os campos originais categoria e material
    delete dadosMapeados.categoria;
    delete dadosMapeados.material;

    console.log('Dados após mapeamento:', dadosMapeados);
    console.log('JSON que será enviado:', JSON.stringify(dadosMapeados, null, 2));

    const response = await fetch(`${API_BASE_URL}/pecas/cadastrar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dadosMapeados)
    });

    console.log('Status da resposta:', response.status);

    if (!response.ok) {
      const error = await response.json();
      console.error('Erro do backend:', error);
      throw new Error(error.error || `Erro ao cadastrar peça: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Peça cadastrada com sucesso:', data);
    return data;
  } catch (error) {
    console.error('Erro ao cadastrar peça:', error);
    throw error;
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
      }
    });

    if (!response.ok) {
      throw new Error(`Erro ao buscar peça: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao buscar peça:', error);
    throw error;
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
      body: JSON.stringify(dadosFiltrados)
    });

    if (!response.ok) {
      throw new Error(`Erro ao atualizar peça: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao atualizar peça:', error);
    throw error;
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
      }
    });

    if (!response.ok) {
      throw new Error(`Erro ao deletar peça: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao deletar peça:', error);
    throw error;
  }
};
