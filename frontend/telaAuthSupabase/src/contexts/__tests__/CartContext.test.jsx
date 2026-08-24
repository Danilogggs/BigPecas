import { renderHook, act } from '@testing-library/react';
import { CartProvider, useCart } from '../CartContext';

const FRISO = { id: 10, nome: 'Friso Opala', preco: 350, estoque: 3 };
const RODA = { id: 11, nome: 'Roda Weber', preco: 900, estoque: 2 };

function montarCarrinho() {
  return renderHook(() => useCart(), { wrapper: CartProvider });
}

function carrinhoSalvo() {
  return JSON.parse(localStorage.getItem('cartItems'));
}

describe('CartContext', () => {
  it('comeca vazio quando nao ha nada salvo', () => {
    const { result } = montarCarrinho();

    expect(result.current.cartItems).toEqual([]);
    expect(result.current.getTotal()).toBe(0);
  });

  describe('addToCart', () => {
    it('adiciona um item novo com quantidade 1', () => {
      const { result } = montarCarrinho();

      act(() => { result.current.addToCart(FRISO); });

      expect(result.current.cartItems).toEqual([{ ...FRISO, quantidade: 1 }]);
    });

    it('incrementa a quantidade de um item ja existente', () => {
      const { result } = montarCarrinho();

      act(() => { result.current.addToCart(FRISO); });
      act(() => { result.current.addToCart(FRISO); });

      expect(result.current.cartItems).toHaveLength(1);
      expect(result.current.cartItems[0].quantidade).toBe(2);
    });

    it('nunca ultrapassa o estoque disponivel', () => {
      const { result } = montarCarrinho();

      act(() => { result.current.addToCart(FRISO); });
      act(() => { result.current.addToCart(FRISO); });
      act(() => { result.current.addToCart(FRISO); });
      act(() => { result.current.addToCart(FRISO); });

      expect(result.current.cartItems[0].quantidade).toBe(3);
    });

    it('mantem itens diferentes separados', () => {
      const { result } = montarCarrinho();

      act(() => { result.current.addToCart(FRISO); });
      act(() => { result.current.addToCart(RODA); });

      expect(result.current.cartItems.map((item) => item.id)).toEqual([10, 11]);
    });
  });

  describe('updateQuantity', () => {
    it('atualiza a quantidade dentro do estoque', () => {
      const { result } = montarCarrinho();

      act(() => { result.current.addToCart(FRISO); });
      act(() => { result.current.updateQuantity(10, 3, 3); });

      expect(result.current.cartItems[0].quantidade).toBe(3);
    });

    it('ignora quantidade acima do estoque', () => {
      const { result } = montarCarrinho();

      act(() => { result.current.addToCart(FRISO); });
      act(() => { result.current.updateQuantity(10, 4, 3); });

      expect(result.current.cartItems[0].quantidade).toBe(1);
    });

    it.each([[0], [-1]])('remove o item quando a quantidade vira %i', (quantidade) => {
      const { result } = montarCarrinho();

      act(() => { result.current.addToCart(FRISO); });
      act(() => { result.current.updateQuantity(10, quantidade, 3); });

      expect(result.current.cartItems).toEqual([]);
    });

    it('nao mexe nos outros itens do carrinho', () => {
      const { result } = montarCarrinho();

      act(() => { result.current.addToCart(FRISO); });
      act(() => { result.current.addToCart(RODA); });
      act(() => { result.current.updateQuantity(10, 2, 3); });

      expect(result.current.cartItems[1].quantidade).toBe(1);
    });
  });

  describe('removeFromCart', () => {
    it('remove apenas o item informado', () => {
      const { result } = montarCarrinho();

      act(() => { result.current.addToCart(FRISO); });
      act(() => { result.current.addToCart(RODA); });
      act(() => { result.current.removeFromCart(10); });

      expect(result.current.cartItems.map((item) => item.id)).toEqual([11]);
    });

    it('nao faz nada quando o item nao esta no carrinho', () => {
      const { result } = montarCarrinho();

      act(() => { result.current.addToCart(FRISO); });
      act(() => { result.current.removeFromCart(999); });

      expect(result.current.cartItems).toHaveLength(1);
    });
  });

  describe('clearCart', () => {
    it('esvazia o carrinho', () => {
      const { result } = montarCarrinho();

      act(() => { result.current.addToCart(FRISO); });
      act(() => { result.current.addToCart(RODA); });
      act(() => { result.current.clearCart(); });

      expect(result.current.cartItems).toEqual([]);
      expect(result.current.getTotal()).toBe(0);
    });
  });

  describe('getTotal', () => {
    it('soma preco x quantidade de todos os itens', () => {
      const { result } = montarCarrinho();

      act(() => { result.current.addToCart(FRISO); });
      act(() => { result.current.addToCart(FRISO); });
      act(() => { result.current.addToCart(RODA); });

      expect(result.current.getTotal()).toBe(350 * 2 + 900);
    });
  });

  describe('persistencia no localStorage', () => {
    it('salva o carrinho a cada alteracao', () => {
      const { result } = montarCarrinho();

      act(() => { result.current.addToCart(FRISO); });

      expect(carrinhoSalvo()).toEqual([{ ...FRISO, quantidade: 1 }]);
    });

    it('restaura o carrinho salvo ao montar', () => {
      localStorage.setItem('cartItems', JSON.stringify([{ ...RODA, quantidade: 2 }]));

      const { result } = montarCarrinho();

      expect(result.current.cartItems).toEqual([{ ...RODA, quantidade: 2 }]);
      expect(result.current.getTotal()).toBe(1800);
    });

    it('comeca vazio quando o conteudo salvo esta corrompido', () => {
      localStorage.setItem('cartItems', '{isso não é json}');

      const { result } = montarCarrinho();

      expect(result.current.cartItems).toEqual([]);
    });
  });

  describe('useCart', () => {
    it('exige o CartProvider', () => {
      expect(() => renderHook(() => useCart())).toThrow(
        'useCart must be used within a CartProvider',
      );
    });
  });
});
