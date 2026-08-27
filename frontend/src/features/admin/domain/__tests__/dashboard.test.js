import {
  WIDGETS_PADRAO,
  alternarWidget,
  filtrarWidgetsValidos,
  moverWidget,
} from '../dashboard';

describe('domínio do painel administrativo', () => {
  it('remove widgets desconhecidos e usa o padrão quando necessário', () => {
    expect(filtrarWidgetsValidos(['usuarios', 'desconhecido'])).toEqual([
      'boas_vindas', 'faturamento', 'pedidos', 'ticket_medio', 'taxa_conclusao',
      'usuarios', 'desempenho_vendas', 'requer_atencao', 'fluxo_pedidos',
      'resumo_plataforma', 'atividade_recente',
    ]);
    expect(filtrarWidgetsValidos([])).toEqual(WIDGETS_PADRAO);
    expect(filtrarWidgetsValidos([
      'boas_vindas', 'usuarios', 'administradores', 'pecas', 'pedidos', 'pedidos_pendentes',
      'avaliacoes', 'fluxo_pedidos', 'estoque_baixo', 'atividade_recente', 'seguranca',
      'faturamento', 'ticket_medio', 'taxa_conclusao', 'taxa_cancelamento',
      'desempenho_vendas', 'produtos_top',
    ])).toEqual(WIDGETS_PADRAO);
  });

  it('mantém pelo menos um widget ativo', () => {
    expect(alternarWidget(['usuarios'], 'usuarios')).toEqual(['usuarios']);
    expect(alternarWidget(['usuarios'], 'pecas')).toEqual(['usuarios', 'pecas']);
  });

  it('reordena apenas para posições válidas', () => {
    expect(moverWidget(['usuarios', 'pecas'], 'pecas', -1)).toEqual(['pecas', 'usuarios']);
    expect(moverWidget(['usuarios', 'pecas'], 'usuarios', -1)).toEqual(['usuarios', 'pecas']);
  });
});
