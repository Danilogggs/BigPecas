const AppError = require('../../../utils/AppError');
const { criarPayloadCalculo, normalizarOpcoesFrete } = require('../domain/frete');

function criarFreteUseCases({ gateway }) {
  async function calcular(dados) {
    const { destino, payload } = criarPayloadCalculo(dados);
    const response = await gateway.calcular(payload);
    const data = await response.json();
    if (!response.ok) {
      throw new AppError(response.status, data?.message || data?.error || 'Erro ao calcular frete no Melhor Envio.');
    }
    return { opcoes: normalizarOpcoesFrete(data), cep_destino: destino };
  }

  async function renovar() {
    const data = await gateway.renovarToken();
    return { message: 'Token renovado com sucesso.', expires_in: data.expires_in };
  }

  return Object.freeze({ calcular, renovar });
}

module.exports = criarFreteUseCases;
