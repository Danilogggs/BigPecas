import { contarNaoLidas, marcarNotificacaoLida } from '../notificacao';

describe('domínio de notificações', () => {
  it('conta e marca notificações comparando ids de tipos diferentes', () => {
    const itens = [{ id: 1, lida_em: null }, { id: 2, lida_em: '2026-01-01' }];
    expect(contarNaoLidas(itens)).toBe(1);
    expect(marcarNotificacaoLida(itens, '1', '2026-02-01')[0].lida_em).toBe('2026-02-01');
  });
});
