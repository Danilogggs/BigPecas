import { criarProdutosFrete, formatarCep, sanitizarCep, validarCupom } from '../frete';

describe('domínio de frete', () => {
  it('normaliza CEP e produtos com dimensões padrão', () => {
    expect(sanitizarCep('01.310-100')).toBe('01310100');
    expect(formatarCep('01310100')).toBe('01310-100');
    expect(criarProdutosFrete([{ id: 1 }])[0]).toMatchObject({
      peso_gramas: 1000, comprimento_mm: 200, largura_mm: 150,
      altura_mm: 100, preco: 0, quantidade: 1,
    });
  });

  it('valida cupom e subtotal mínimo sem depender da API', () => {
    expect(validarCupom(' bigpecas10 ', 100)).toMatchObject({ codigo: 'BIGPECAS10', valor: 0.1 });
    expect(() => validarCupom('PRIMEIRA20', 199)).toThrow('Subtotal mínimo');
  });
});
