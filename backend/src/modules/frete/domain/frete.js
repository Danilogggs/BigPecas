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
    prazo_texto: (opcao.custom_delivery_range?.min ?? opcao.delivery_time) === 1
      ? 'Entrega em 1 dia útil'
      : `Entrega em até ${opcao.custom_delivery_range?.max ?? opcao.delivery_time} dias úteis`,
    desconto: Number(opcao.discount || 0),
  })).sort((a, b) => a.valor - b.valor);
}

module.exports = { criarPayloadCalculo, normalizarOpcoesFrete };
