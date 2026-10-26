const AppError = require('../../../utils/AppError');

const MAXIMO_ITENS = 50;
const MAXIMO_QUANTIDADE = 999;

function inteiroPositivo(valor) {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

function sanitizarItens(itens) {
  if (!Array.isArray(itens)) throw new AppError(400, 'Informe os itens do carrinho.');
  const porPeca = new Map();
  itens.forEach((item) => {
    const pecaId = inteiroPositivo(item?.peca_id ?? item?.id);
    const quantidade = inteiroPositivo(item?.quantidade);
    if (!pecaId || !quantidade) return;
    porPeca.set(pecaId, Math.min(quantidade, MAXIMO_QUANTIDADE));
  });
  if (porPeca.size > MAXIMO_ITENS) {
    throw new AppError(400, `O carrinho aceita no máximo ${MAXIMO_ITENS} peças diferentes.`);
  }
  return [...porPeca].map(([pecaId, quantidade]) => ({ peca_id: pecaId, quantidade }));
}

// Os dados exibidos vem sempre da peca atual: preco e estoque nao ficam
// congelados no carrinho, e pecas removidas ou sem estoque somem dele.
function montarItensCarrinho(registros = [], pecas = []) {
  const pecasPorId = new Map(pecas.map((peca) => [Number(peca.id), peca]));
  return registros.flatMap(({ peca_id: pecaId, quantidade }) => {
    const peca = pecasPorId.get(Number(pecaId));
    const estoque = Number(peca?.estoque_atual) || 0;
    if (!peca || estoque <= 0) return [];
    return [{
      id: peca.id,
      nome: peca.nome_peca,
      preco: peca.preco,
      imagem: peca.imagem,
      estoque,
      sku: peca.sku,
      peso_gramas: peca.peso_gramas,
      comprimento_mm: peca.comprimento_mm,
      largura_mm: peca.largura_mm,
      altura_mm: peca.altura_mm,
      quantidade: Math.min(quantidade, estoque),
    }];
  });
}

module.exports = { montarItensCarrinho, sanitizarItens };
