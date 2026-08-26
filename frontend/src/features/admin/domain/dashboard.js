export const WIDGETS_PADRAO = Object.freeze([
  'usuarios', 'pecas', 'pedidos', 'pedidos_pendentes', 'avaliacoes',
]);

export const WIDGETS_ADMIN = Object.freeze({
  usuarios: { label: 'adminUsers' },
  administradores: { label: 'adminAdministrators' },
  pecas: { label: 'adminParts' },
  pedidos: { label: 'adminOrders' },
  pedidos_pendentes: { label: 'adminPending' },
  avaliacoes: { label: 'adminReviews' },
});

export function filtrarWidgetsValidos(widgets) {
  const validos = widgets?.filter((widget) => WIDGETS_ADMIN[widget]);
  return validos?.length ? validos : [...WIDGETS_PADRAO];
}

export function alternarWidget(widgets, widget) {
  if (widgets.includes(widget)) {
    return widgets.length === 1 ? widgets : widgets.filter((item) => item !== widget);
  }
  return [...widgets, widget];
}

export function moverWidget(widgets, widget, direcao) {
  const origem = widgets.indexOf(widget);
  const destino = origem + direcao;
  if (origem < 0 || destino < 0 || destino >= widgets.length) return widgets;
  const reordenados = [...widgets];
  [reordenados[origem], reordenados[destino]] = [reordenados[destino], reordenados[origem]];
  return reordenados;
}
