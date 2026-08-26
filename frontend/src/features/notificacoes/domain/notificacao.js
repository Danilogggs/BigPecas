export const marcarNotificacaoLida = (notificacoes, id, data = new Date().toISOString()) => (
  notificacoes.map((item) => String(item.id) === String(id) ? { ...item, lida_em: data } : item)
);

export const contarNaoLidas = (notificacoes) => notificacoes.filter((item) => !item.lida_em).length;
