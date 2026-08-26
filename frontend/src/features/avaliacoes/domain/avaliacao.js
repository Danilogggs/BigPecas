export function notaValida(nota) {
  const valor = Number(nota);
  return Number.isInteger(valor) && valor >= 1 && valor <= 5;
}

export const avaliacaoLiberada = (estado) => estado?.liberada === true;
export const itensPendentesAvaliacao = (estado) => [
  ...(estado?.fornecedores || []), ...(estado?.produtos || []),
].filter((item) => !item.avaliado);
