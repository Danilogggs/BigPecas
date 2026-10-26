export function formatarPrecoPeca(valor, fallback = 'Preço não informado') {
  const numero = Number(valor);
  if (Number.isNaN(numero)) return valor ? `R$ ${valor}` : fallback;
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatarDataPeca(valor, formatarData) {
  if (!valor) return '';
  return formatarData(valor, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const CHAVES_CONDICAO = Object.freeze({
  NOS: 'conditionNos',
  EXCELENTE: 'conditionExcellent',
  BOM: 'conditionGood',
  ACEITAVEL: 'conditionAcceptable',
  USADO: 'conditionUsed',
  USED: 'conditionUsed',
  REFABRICADO: 'conditionRefurbished',
  REFURBISHED: 'conditionRefurbished',
  RESTAURADA: 'conditionRestored',
  RESTAURADO: 'conditionRestored',
});

// Condicao gravada no banco (ex.: "ACEITÁVEL") -> chave de traducao. Valores
// desconhecidos voltam como estao, para que t() os exiba sem alteracao.
export function chaveCondicaoPeca(condicao) {
  const normalizada = String(condicao || '').trim().toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return CHAVES_CONDICAO[normalizada] || condicao;
}
