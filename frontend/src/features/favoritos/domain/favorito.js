export const extrairPecasFavoritas = (resposta) => (
  Array.isArray(resposta?.pecas) ? resposta.pecas : []
);

export const criarIdsFavoritos = (pecas) => new Set(
  pecas.map((peca) => String(peca.id)),
);

export const removerFavoritoDaLista = (pecas, pecaId) => pecas.filter(
  (peca) => String(peca.id) !== String(pecaId),
);
