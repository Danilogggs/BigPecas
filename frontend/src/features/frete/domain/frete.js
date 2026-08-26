export const CEP_ORIGEM_PADRAO = '01310100';

export function sanitizarCep(cep = '') {
  return String(cep).replace(/\D/g, '').slice(0, 8);
}

export function formatarCep(cep = '') {
  const limpo = sanitizarCep(cep);
  return limpo.length <= 5 ? limpo : `${limpo.slice(0, 5)}-${limpo.slice(5)}`;
}

export const validarCep = (cep = '') => sanitizarCep(cep).length === 8;

export function criarProdutosFrete(itens) {
  return itens.map((item) => ({
    id: item.id,
    peso_gramas: Number(item.peso_gramas) || 1000,
    comprimento_mm: Number(item.comprimento_mm) || 200,
    largura_mm: Number(item.largura_mm) || 150,
    altura_mm: Number(item.altura_mm) || 100,
    preco: Number(item.preco) || 0,
    quantidade: Number(item.quantidade) || 1,
  }));
}

const CUPONS = Object.freeze({
  BIGPECAS10: { tipo: 'percentual', valor: 0.1, descricao: '10% OFF no subtotal' },
  FRETE0: { tipo: 'frete_gratis', valor: 1, descricao: 'Frete grátis' },
  PRIMEIRA20: { tipo: 'percentual', valor: 0.2, descricao: '20% OFF na primeira compra', minimo: 200 },
});

export function validarCupom(codigo, subtotal) {
  const normalizado = String(codigo || '').trim().toUpperCase();
  const aplicacao = CUPONS[normalizado];
  if (!aplicacao) throw new Error('Cupom inválido ou expirado.');
  if (aplicacao.minimo && subtotal < aplicacao.minimo) {
    throw new Error(`Subtotal mínimo de R$ ${aplicacao.minimo.toFixed(2)} para usar este cupom.`);
  }
  return { codigo: normalizado, ...aplicacao };
}
