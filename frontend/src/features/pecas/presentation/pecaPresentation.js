export function formatarPrecoPeca(valor, fallback = 'Preço não informado') {
  const numero = Number(valor);
  if (Number.isNaN(numero)) return valor ? `R$ ${valor}` : fallback;
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatarDataPeca(valor, formatarData) {
  if (!valor) return '';
  return formatarData(valor, { day: '2-digit', month: '2-digit', year: 'numeric' });
}
