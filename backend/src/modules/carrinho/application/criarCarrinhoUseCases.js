const AppError = require('../../../utils/AppError');
const { obterEmailIdentidade } = require('../../favoritos/domain/favorito');
const { montarItensCarrinho, sanitizarItens } = require('../domain/carrinho');

function criarCarrinhoUseCases({ repository }) {
  async function usuarioAtual(identidade) {
    const email = obterEmailIdentidade(identidade);
    if (!email) throw new AppError(401, 'Não foi possível identificar o e-mail do usuário logado.');
    const usuario = await repository.buscarUsuarioPorEmail(email);
    if (!usuario?.id) throw new AppError(404, 'Usuário não encontrado na tabela users.');
    return usuario;
  }

  async function obter(identidade) {
    const usuario = await usuarioAtual(identidade);
    const carrinho = await repository.buscarCarrinho(usuario.id);
    if (!carrinho) return { itens: [], atualizado_em: null };
    const registros = sanitizarItens(carrinho.itens || []);
    const pecas = registros.length
      ? await repository.listarPecas(registros.map((item) => item.peca_id))
      : [];
    return { itens: montarItensCarrinho(registros, pecas), atualizado_em: carrinho.updated_at };
  }

  async function salvar(identidade, itens) {
    const usuario = await usuarioAtual(identidade);
    const carrinho = await repository.salvarCarrinho(usuario.id, sanitizarItens(itens));
    return { message: 'Carrinho salvo.', atualizado_em: carrinho?.updated_at || null };
  }

  return Object.freeze({ obter, salvar });
}

module.exports = criarCarrinhoUseCases;
