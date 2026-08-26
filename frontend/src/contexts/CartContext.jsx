import { createContext, useContext, useState, useEffect } from 'react';
import {
  adicionarItemCarrinho,
  atualizarQuantidadeCarrinho,
  calcularSubtotalCarrinho,
  removerItemCarrinho,
} from '../features/carrinho/domain/carrinho';
import localStorageCartRepository from '../features/carrinho/infrastructure/localStorageCartRepository';

const CartContext = createContext();

export const CartProvider = ({ children, cartRepository = localStorageCartRepository }) => {
  const [cartItems, setCartItems] = useState(() => cartRepository.carregar());

  useEffect(() => {
    cartRepository.salvar(cartItems);
  }, [cartItems, cartRepository]);

  // Adicionar item ao carrinho
  const addToCart = (item) => {
    setCartItems((itens) => adicionarItemCarrinho(itens, item));
  };

  // Remover item do carrinho
  const removeFromCart = (itemId) => {
    setCartItems((itens) => removerItemCarrinho(itens, itemId));
  };

  // Atualizar quantidade do item
  const updateQuantity = (itemId, newQuantity, maxEstoque) => {
    setCartItems((itens) => atualizarQuantidadeCarrinho(
      itens,
      itemId,
      newQuantity,
      maxEstoque,
    ));
  };

  // Limpar carrinho
  const clearCart = () => {
    setCartItems([]);
  };

  // Calcular total
  const getTotal = () => {
    return calcularSubtotalCarrinho(cartItems);
  };

  const value = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotal,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
