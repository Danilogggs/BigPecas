const CHAVE_CARRINHO = 'cartItems';

const localStorageCartRepository = Object.freeze({
  carregar() {
    const salvo = localStorage.getItem(CHAVE_CARRINHO);
    if (!salvo) return [];
    try {
      const itens = JSON.parse(salvo);
      return Array.isArray(itens) ? itens : [];
    } catch (error) {
      console.error('Erro ao carregar carrinho:', error);
      return [];
    }
  },

  salvar(itens) {
    localStorage.setItem(CHAVE_CARRINHO, JSON.stringify(itens));
  },
});

export default localStorageCartRepository;
