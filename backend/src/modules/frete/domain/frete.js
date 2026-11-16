const AppError = require('../../../utils/AppError');

function normalizarCep(valor, rotulo) {
  const cep = String(valor || '').replace(/\D/g, '');
  if (!/^\d{8}$/.test(cep)) throw new AppError(400, `CEP de ${rotulo} inválido.`);
  return cep;
}

function numero(valor, padrao = 0) {
  const resultado = parseFloat(String(valor ?? '').replace(/[^\d.]/g, ''));
  return Number.isNaN(resultado) ? padrao : resultado;
}

function criarPayloadCalculo({ cep_origem, cep_destino, produtos }) {
  const origem = normalizarCep(cep_origem, 'origem');
  const destino = normalizarCep(cep_destino, 'destino');
  if (!Array.isArray(produtos) || produtos.length === 0) {
    throw new AppError(400, 'Informe ao menos um produto para calcular o frete.');
  }
  return {
    destino,
    payload: {
      from: { postal_code: origem },
      to: { postal_code: destino },
      products: produtos.map((produto, index) => ({
        id: String(produto.id || index + 1),
        width: Math.max(1, Math.round(numero(produto.largura_mm, 150) / 10)),
        height: Math.max(1, Math.round(numero(produto.altura_mm, 100) / 10)),
        length: Math.max(1, Math.round(numero(produto.comprimento_mm, 200) / 10)),
        weight: Math.max(0.1, numero(produto.peso_gramas, 500) / 1000),
        insurance_value: Math.max(1, numero(produto.preco, 100)),
        quantity: Math.max(1, Math.round(numero(produto.quantidade, 1))),
      })),
    },
  };
}

function textoPrazo(min, max) {
  return min === 1 ? 'Entrega em 1 dia útil' : `Entrega em até ${max} dias úteis`;
}

function normalizarOpcoesFrete(data) {
  if (!Array.isArray(data)) return [];
  return data.filter((opcao) => opcao.price && !opcao.error).map((opcao) => ({
    id: opcao.id,
    transportadora: opcao.company?.name || opcao.name,
    tipo: opcao.name,
    logo: opcao.company?.picture || null,
    valor: Number(opcao.custom_price || opcao.price),
    prazo_min: opcao.custom_delivery_range?.min ?? opcao.delivery_range?.min ?? opcao.delivery_time,
    prazo_max: opcao.custom_delivery_range?.max ?? opcao.delivery_range?.max ?? opcao.delivery_time,
    prazo_dias: opcao.custom_delivery_time || opcao.delivery_time,
    prazo_texto: textoPrazo(
      opcao.custom_delivery_range?.min ?? opcao.delivery_time,
      opcao.custom_delivery_range?.max ?? opcao.delivery_time,
    ),
    desconto: Number(opcao.discount || 0),
  })).sort((a, b) => a.valor - b.valor);
}

// Cotacao aproximada usada quando o Melhor Envio esta indisponivel (token
// invalido, fora do ar), para que o checkout nao fique bloqueado. A distancia
// e estimada pela diferenca entre as regioes postais (primeiro digito do CEP).
function estimarOpcoesFrete(payload) {
  const pesoKg = payload.products.reduce((total, produto) => total + produto.weight * produto.quantity, 0);
  const distancia = Math.abs(Number(payload.from.postal_code[0]) - Number(payload.to.postal_code[0]));
  const arredondar = (valor) => Math.round(valor * 100) / 100;
  const pac = arredondar(18 + 6 * pesoKg + 3 * distancia);
  const opcoes = [
    { id: 'estimativa-pac', tipo: 'PAC', valor: pac, prazo_min: 4 + distancia, prazo_max: 6 + distancia },
    {
      id: 'estimativa-sedex',
      tipo: 'SEDEX',
      valor: arredondar(pac * 1.7),
      prazo_min: 1 + Math.ceil(distancia / 2),
      prazo_max: 2 + Math.ceil(distancia / 2),
    },
  ];
  return opcoes.map((opcao) => ({
    ...opcao,
    transportadora: 'Correios (estimativa)',
    logo: null,
    prazo_dias: opcao.prazo_max,
    prazo_texto: textoPrazo(opcao.prazo_min, opcao.prazo_max),
    desconto: 0,
    estimado: true,
  }));
}

module.exports = { criarPayloadCalculo, estimarOpcoesFrete, normalizarOpcoesFrete };
