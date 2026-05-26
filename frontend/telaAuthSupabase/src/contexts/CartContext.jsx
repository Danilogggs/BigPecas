import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);

  // Carregar carrinho do localStorage ao montar
  useEffect(() => {
    const savedCart = localStorage.getItem('cartItems');
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (error) {
        console.error('Erro ao carregar carrinho:', error);
      }
    }
  }, []);

  // Salvar carrinho no localStorage sempre que mudar
  useEffect(() => {
    localStorage.setItem('cartItems', JSON.stringify(cartItems));
  }, [cartItems]);

  // Adicionar item ao carrinho
  const addToCart = (item) => {
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((cartItem) => cartItem.id === item.id);

      if (existingItem) {
        // Se o item já existe, aumentar quantidade
        return prevItems.map((cartItem) =>
          cartItem.id === item.id
            ? { ...cartItem, quantidade: Math.min(cartItem.quantidade + 1, item.estoque) }
            : cartItem
        );
      } else {
        // Adicionar novo item
        return [...prevItems, { ...item, quantidade: 1 }];
      }
    });
  };

  // Remover item do carrinho
  const removeFromCart = (itemId) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
  };

  // Atualizar quantidade do item
  const updateQuantity = (itemId, newQuantity, maxEstoque) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    if (newQuantity > maxEstoque) {
      return; // Não permite quantidade maior que o estoque
    }

    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId ? { ...item, quantidade: newQuantity } : item
      )
    );
  };

  // Limpar carrinho
  const clearCart = () => {
    setCartItems([]);
  };

  // Calcular total
  const getTotal = () => {
    return cartItems.reduce((total, item) => total + item.preco * item.quantidade, 0);
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
