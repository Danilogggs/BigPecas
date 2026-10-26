const { sanitizeAuditValue } = require('../../src/services/auditMetadata');

describe('auditMetadata', () => {
  it('preserva detalhes operacionais e remove segredos em qualquer nível', () => {
    expect(sanitizeAuditValue({
      pedido_id: 10,
      itens: [{ peca_id: 7, quantidade: 2, preco: 99.9 }],
      cliente: { email: 'cliente@example.com', senha: 'secreta' },
      authorization: 'Bearer token',
      pagamento: { card_number: '4111111111111111', cvv: '123' },
    })).toEqual({
      pedido_id: 10,
      itens: [{ peca_id: 7, quantidade: 2, preco: 99.9 }],
      cliente: { email: 'cliente@example.com', senha: '[REMOVIDO]' },
      authorization: '[REMOVIDO]',
      pagamento: { card_number: '[REMOVIDO]', cvv: '[REMOVIDO]' },
    });
  });
});
