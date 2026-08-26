export const FORMAS_PAGAMENTO = Object.freeze([
  Object.freeze({ id: 'pix', nome: 'PIX', descricao: 'Aprovação imediata', icone: '📱', desconto: 0.05 }),
  Object.freeze({ id: 'cartao', nome: 'Cartão de Crédito', descricao: 'Em até 12x sem juros', icone: '💳', desconto: 0 }),
  Object.freeze({ id: 'boleto', nome: 'Boleto Bancário', descricao: 'Compensação em até 2 dias úteis', icone: '🧾', desconto: 0.03 }),
]);

export function adicionarItemCarrinho(itens, item) {
  const existente = itens.find((atual) => atual.id === item.id);
  if (!existente) return [...itens, { ...item, quantidade: 1 }];
  return itens.map((atual) => atual.id === item.id
    ? { ...atual, quantidade: Math.min(atual.quantidade + 1, item.estoque) }
    : atual);
}

export function removerItemCarrinho(itens, itemId) {
  return itens.filter((item) => item.id !== itemId);
}

export function atualizarQuantidadeCarrinho(itens, itemId, quantidade, estoqueMaximo) {
  if (quantidade <= 0) return removerItemCarrinho(itens, itemId);
  if (quantidade > estoqueMaximo) return itens;
  return itens.map((item) => item.id === itemId ? { ...item, quantidade } : item);
}

export function calcularSubtotalCarrinho(itens) {
  return itens.reduce(
    (total, item) => total + Number(item.preco || 0) * Number(item.quantidade || 0),
    0,
  );
}

export function contarItensCarrinho(itens) {
  return itens.reduce((total, item) => total + Number(item.quantidade || 0), 0);
}

export function calcularTotaisCompra({ subtotal, frete, cupom, formaPagamento }) {
  let desconto = 0;
  let valorFrete = Number(frete?.valor || 0);

  if (cupom?.tipo === 'percentual') desconto = subtotal * Number(cupom.valor || 0);
  else if (cupom?.tipo === 'frete_gratis') {
    desconto = valorFrete;
    valorFrete = 0;
  }

  const descontoPagamento = formaPagamento
    ? subtotal * Number(formaPagamento.desconto || 0)
    : 0;
  const total = Math.max(0, subtotal - desconto - descontoPagamento + valorFrete);
  return { desconto, valorFrete, descontoPagamento, total };
}

export function criarErrosEndereco(endereco, mensagens) {
  const erros = {};
  if (!endereco.nome.trim()) erros.nome = mensagens.nome;
  if (!mensagens.validarCep(endereco.cep)) erros.cep = mensagens.cep;
  if (!endereco.logradouro.trim()) erros.logradouro = mensagens.logradouro;
  if (!endereco.numero.trim()) erros.numero = mensagens.numero;
  if (!endereco.bairro.trim()) erros.bairro = mensagens.bairro;
  if (!endereco.cidade.trim()) erros.cidade = mensagens.cidade;
  if (!endereco.uf.trim()) erros.uf = 'UF';
  if (!endereco.telefone.trim() || endereco.telefone.length < 10) {
    erros.telefone = mensagens.telefone;
  }
  return erros;
}

export function criarErrosCartao(dados, mensagens) {
  const erros = {};
  const numero = dados.numero.replace(/\D/g, '');
  if (numero.length < 13 || numero.length > 19) erros.cardNumero = mensagens.numero;
  if (!dados.nome.trim()) erros.cardNome = mensagens.nome;
  if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(dados.validade)) erros.cardValidade = mensagens.validade;
  if (!/^\d{3,4}$/.test(dados.cvv)) erros.cardCvv = mensagens.cvv;
  return erros;
}

export function formatarNumeroCartao(valor) {
  return valor.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

export function formatarValidadeCartao(valor) {
  const limpo = valor.replace(/\D/g, '').slice(0, 4);
  if (limpo.length <= 2) return limpo;
  return `${limpo.slice(0, 2)}/${limpo.slice(2)}`;
}
