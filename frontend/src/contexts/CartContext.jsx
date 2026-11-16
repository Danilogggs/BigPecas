import { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  adicionarItemCarrinho,
  atualizarQuantidadeCarrinho,
  calcularSubtotalCarrinho,
  removerItemCarrinho,
} from '../features/carrinho/domain/carrinho';
import localStorageCartRepository from '../features/carrinho/infrastructure/localStorageCartRepository';
import apiCartRepository from '../features/carrinho/infrastructure/apiCartRepository';
import { useUsuarioAutenticado } from './AuthContext';

const CartContext = createContext();
const ATRASO_SALVAR_REMOTO_MS = 400;

export const CartProvider = ({
  children,
  cartRepository = localStorageCartRepository,
  remoteCartRepository = apiCartRepository,
}) => {
  const userId = useUsuarioAutenticado()?.id || null;
  const [cartItems, setCartItems] = useState(() => cartRepository.carregar());
  // Id do usuario cujo carrinho remoto ja foi carregado. Enquanto nao bate com
  // o usuario atual, nada e enviado ao servidor para nao sobrescrever o que
  // foi salvo em outro navegador.
  const [sincronizadoCom, setSincronizadoCom] = useState(null);
  const usuarioAnterior = useRef(userId);

  useEffect(() => {
    const anterior = usuarioAnterior.current;
    usuarioAnterior.current = userId;
    if (!userId) {
      setSincronizadoCom(null);
      // Logout: o carrinho continua salvo na conta, mas nao fica neste navegador.
      if (anterior) setCartItems([]);
      return undefined;
    }

    let ativo = true;
    remoteCartRepository.carregar()
      .then((remoto) => {
        // Sem registro remoto (conta que ainda nao sincronizou): mantem o local,
        // que sera enviado em seguida.
        if (ativo && remoto?.atualizado_em) setCartItems(remoto.itens || []);
      })
      .catch((error) => console.error('Erro ao carregar carrinho salvo:', error))
      .finally(() => { if (ativo) setSincronizadoCom(userId); });
    return () => { ativo = false; };
  }, [userId, remoteCartRepository]);

  useEffect(() => {
    cartRepository.salvar(cartItems);
  }, [cartItems, cartRepository]);

  useEffect(() => {
    if (!userId || sincronizadoCom !== userId) return undefined;
    const timer = setTimeout(() => {
      remoteCartRepository.salvar(cartItems)
        .catch((error) => console.error('Erro ao salvar carrinho:', error));
    }, ATRASO_SALVAR_REMOTO_MS);
    return () => clearTimeout(timer);
  }, [cartItems, remoteCartRepository, userId, sincronizadoCom]);

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
