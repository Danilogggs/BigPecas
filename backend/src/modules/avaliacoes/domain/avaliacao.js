const AppError = require('../../../utils/AppError');

function media(lista, campo) {
  if (!lista.length) return 0;
  const total = lista.reduce((soma, item) => soma + Number(item[campo] || 0), 0);
  return Number((total / lista.length).toFixed(1));
}

const resumoAvaliacoes = (avaliacoes) => ({ total: avaliacoes.length, media: media(avaliacoes, 'nota') });

function validarNota(valor, campo = 'nota') {
  const nota = Number(valor);
  if (!Number.isInteger(nota) || nota < 1 || nota > 5) {
    throw new AppError(400, `${campo} deve ser um número inteiro entre 1 e 5.`);
  }
  return nota;
}

function normalizarComentario(valor) {
  const comentario = String(valor || '').trim();
  if (comentario.length > 1000) throw new AppError(400, 'O comentário deve ter no máximo 1000 caracteres.');
  return comentario || null;
}

function validarCompraEntregue(pedido) {
  if (pedido.status !== 'entregue') {
    throw new AppError(409, 'A avaliação só é liberada após o comprador confirmar o recebimento do pedido.');
  }
}

function agruparFornecedores(pedido) {
  const fornecedores = new Map();
  pedido.itens.forEach((item) => {
    const chave = String(item.fornecedor_id);
    if (!fornecedores.has(chave)) {
      fornecedores.set(chave, {
        fornecedor_id: item.fornecedor_id,
        fornecedor_nome: item.fornecedor_nome || 'Vendedor BigPeças',
        venda_id: item.venda_id,
        venda_ids: [],
      });
    }
    fornecedores.get(chave).venda_ids.push(item.venda_id);
  });
  return [...fornecedores.values()];
}

function montarEstadoAvaliacoes(pedido, fornecedores = [], produtos = []) {
  const fornecedorPorId = new Map(fornecedores.map((item) => [String(item.fornecedor_id), item]));
  const produtoPorVenda = new Map(produtos.map((item) => [String(item.venda_id), item]));
  return {
    pedido_id: pedido.id,
    status: pedido.status,
    liberada: pedido.status === 'entregue',
    motivo_bloqueio: pedido.status === 'entregue'
      ? null : 'Confirme o recebimento do pedido para avaliar o vendedor e os produtos.',
    fornecedores: agruparFornecedores(pedido).map((fornecedor) => ({
      ...fornecedor,
      avaliado: fornecedorPorId.has(String(fornecedor.fornecedor_id)),
      avaliacao: fornecedorPorId.get(String(fornecedor.fornecedor_id)) || null,
    })),
    produtos: pedido.itens.map((item) => ({
      peca_id: item.id,
      venda_id: item.venda_id,
      nome: item.nome || item.nome_peca || 'Peça',
      imagem: item.imagem || null,
      fornecedor_id: item.fornecedor_id,
      fornecedor_nome: item.fornecedor_nome || 'Vendedor BigPeças',
      avaliado: produtoPorVenda.has(String(item.venda_id)),
      avaliacao: produtoPorVenda.get(String(item.venda_id)) || null,
    })),
  };
}

module.exports = {
  agruparFornecedores, media, montarEstadoAvaliacoes, normalizarComentario,
  resumoAvaliacoes, validarCompraEntregue, validarNota,
};
