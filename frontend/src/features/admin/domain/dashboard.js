export const WIDGETS_PADRAO = Object.freeze([
  'boas_vindas', 'faturamento', 'pedidos', 'ticket_medio', 'taxa_conclusao',
  'desempenho_vendas', 'requer_atencao',
  'fluxo_pedidos', 'resumo_plataforma', 'atividade_recente',
]);

const LAYOUT_ANTIGO_COMPLETO = [
  'boas_vindas', 'usuarios', 'administradores', 'pecas', 'pedidos',
  'pedidos_pendentes', 'avaliacoes', 'fluxo_pedidos', 'estoque_baixo',
  'atividade_recente', 'seguranca', 'faturamento', 'ticket_medio',
  'taxa_conclusao', 'taxa_cancelamento', 'desempenho_vendas', 'produtos_top',
];

export const WIDGETS_ADMIN = Object.freeze({
  boas_vindas: { label: 'Boas-vindas', type: 'large' },
  usuarios: { label: 'adminUsers', type: 'metric' },
  administradores: { label: 'adminAdministrators', type: 'metric' },
  pecas: { label: 'adminParts', type: 'metric' },
  pedidos: { label: 'adminOrders', type: 'metric' },
  pedidos_pendentes: { label: 'adminPending', type: 'metric' },
  avaliacoes: { label: 'adminReviews', type: 'metric' },
  fluxo_pedidos: { label: 'Fluxo de pedidos', type: 'wide' },
  atividade_recente: { label: 'Atividade recente', type: 'large' },
  requer_atencao: { label: 'Requer atenção', type: 'regular' },
  resumo_plataforma: { label: 'Plataforma', type: 'regular' },
  faturamento: { label: 'Faturamento', type: 'metric' },
  ticket_medio: { label: 'Ticket médio', type: 'metric' },
  taxa_conclusao: { label: 'Taxa de conclusão', type: 'metric' },
  taxa_cancelamento: { label: 'Taxa de cancelamento', type: 'metric' },
  desempenho_vendas: { label: 'Evolução do faturamento', type: 'wide' },
});

export function filtrarWidgetsValidos(widgets) {
  const usaLayoutDescontinuado = widgets?.some((widget) => ['produtos_top', 'estoque_baixo', 'seguranca'].includes(widget));
  if (widgets?.join('|') === LAYOUT_ANTIGO_COMPLETO.join('|') || usaLayoutDescontinuado) return [...WIDGETS_PADRAO];
  const validos = widgets?.filter((widget) => WIDGETS_ADMIN[widget]);
  if (!validos?.length) return [...WIDGETS_PADRAO];
  const temWidgetEstrutural = validos.some((widget) => WIDGETS_ADMIN[widget].type !== 'metric');
  const base = temWidgetEstrutural ? validos : [...validos, ...WIDGETS_PADRAO.filter((widget) => WIDGETS_ADMIN[widget].type !== 'metric')];
  const gerenciais = ['faturamento', 'pedidos', 'ticket_medio', 'taxa_conclusao', 'desempenho_vendas'];
  if (base.some((widget) => gerenciais.slice(0, 4).includes(widget))) return base;
  const boasVindas = base.filter((widget) => widget === 'boas_vindas');
  const metricas = base.filter((widget) => WIDGETS_ADMIN[widget].type === 'metric' && widget !== 'boas_vindas');
  const estruturais = base.filter((widget) => widget !== 'boas_vindas' && WIDGETS_ADMIN[widget].type !== 'metric' && !gerenciais.slice(4).includes(widget));
  return [...boasVindas, ...gerenciais.slice(0, 4), ...metricas, ...gerenciais.slice(4), ...estruturais];
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
