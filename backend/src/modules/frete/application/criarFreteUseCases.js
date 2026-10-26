const AppError = require('../../../utils/AppError');
const { criarPayloadCalculo, estimarOpcoesFrete, normalizarOpcoesFrete } = require('../domain/frete');

// Falhas de credencial ou do proprio Melhor Envio nao sao culpa do comprador:
// nesses casos a cotacao e estimada. Erros de validacao (4xx) continuam
// chegando ao usuario, pois indicam CEP ou medidas invalidas.
const falhaDoProvedor = (status) => status === 401 || status === 403 || status >= 500;

function criarFreteUseCases({ gateway, logger }) {
  function estimar(payload, destino, motivo) {
    logger.warn('Melhor Envio indisponivel; usando frete estimado', { motivo });
    return { opcoes: estimarOpcoesFrete(payload), cep_destino: destino, estimado: true };
  }

  async function calcular(dados) {
    const { destino, payload } = criarPayloadCalculo(dados);
    let response;
    let data;
    try {
      response = await gateway.calcular(payload);
      data = await response.json();
    } catch (error) {
      return estimar(payload, destino, error.message);
    }
    if (!response.ok) {
      if (falhaDoProvedor(response.status)) return estimar(payload, destino, `HTTP ${response.status}`);
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
