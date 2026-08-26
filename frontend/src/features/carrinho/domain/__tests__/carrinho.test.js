import {
  adicionarItemCarrinho,
  atualizarQuantidadeCarrinho,
  calcularSubtotalCarrinho,
  calcularTotaisCompra,
  contarItensCarrinho,
  criarErrosCartao,
  criarErrosEndereco,
  formatarNumeroCartao,
  formatarValidadeCartao,
} from '../carrinho';

describe('domínio do carrinho', () => {
  const item = { id: 1, preco: '25.50', estoque: 2 };

  it('adiciona, incrementa e respeita o estoque da peça', () => {
    const inicial = adicionarItemCarrinho([], item);
    const incrementado = adicionarItemCarrinho(inicial, item);
    const limitado = adicionarItemCarrinho(incrementado, item);

    expect(inicial[0].quantidade).toBe(1);
    expect(incrementado[0].quantidade).toBe(2);
    expect(limitado[0].quantidade).toBe(2);
  });

  it('atualiza quantidades e remove itens ao chegar a zero', () => {
    const itens = [{ ...item, quantidade: 1 }];
    expect(atualizarQuantidadeCarrinho(itens, 1, 2, 2)[0].quantidade).toBe(2);
    expect(atualizarQuantidadeCarrinho(itens, 1, 3, 2)).toEqual(itens);
    expect(atualizarQuantidadeCarrinho(itens, 1, 0, 2)).toEqual([]);
  });

  it('calcula subtotal e quantidade total sem depender da interface', () => {
    const itens = [
      { preco: 10, quantidade: 2 },
      { preco: '5.50', quantidade: 3 },
    ];
    expect(calcularSubtotalCarrinho(itens)).toBe(36.5);
    expect(contarItensCarrinho(itens)).toBe(5);
  });

  it('calcula cupom, frete e desconto da forma de pagamento', () => {
    expect(calcularTotaisCompra({
      subtotal: 100,
      frete: { valor: 20 },
      cupom: { tipo: 'percentual', valor: 0.1 },
      formaPagamento: { desconto: 0.05 },
    })).toEqual({ desconto: 10, valorFrete: 20, descontoPagamento: 5, total: 105 });
  });

  it('valida endereço e cartão retornando erros por campo', () => {
    const mensagensEndereco = {
      nome: 'nome', cep: 'cep', logradouro: 'rua', numero: 'número',
      bairro: 'bairro', cidade: 'cidade', telefone: 'telefone', validarCep: () => false,
    };
    const endereco = {
      nome: '', cep: '', logradouro: '', numero: '', bairro: '', cidade: '', uf: '', telefone: '',
    };
    expect(Object.keys(criarErrosEndereco(endereco, mensagensEndereco))).toEqual([
      'nome', 'cep', 'logradouro', 'numero', 'bairro', 'cidade', 'uf', 'telefone',
    ]);

    expect(Object.keys(criarErrosCartao(
      { numero: '123', nome: '', validade: '15/20', cvv: '1' },
      { numero: 'número', nome: 'nome', validade: 'validade', cvv: 'cvv' },
    ))).toEqual(['cardNumero', 'cardNome', 'cardValidade', 'cardCvv']);
  });

  it('formata número e validade do cartão', () => {
    expect(formatarNumeroCartao('1234-5678 9012')).toBe('1234 5678 9012');
    expect(formatarValidadeCartao('1229')).toBe('12/29');
  });
});
