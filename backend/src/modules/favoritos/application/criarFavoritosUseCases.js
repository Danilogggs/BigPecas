const AppError = require('../../../utils/AppError');
const { obterEmailIdentidade, ordenarPecasPorFavoritos, validarIdPeca } = require('../domain/favorito');

function criarFavoritosUseCases({ repository }) {
  async function usuarioAtual(identidade) {
    const email = obterEmailIdentidade(identidade);
    if (!email) throw new AppError(401, 'Não foi possível identificar o e-mail do usuário logado.');
    const usuario = await repository.buscarUsuarioPorEmail(email);
    if (!usuario?.id) throw new AppError(404, 'Usuário não encontrado na tabela users.');
    return usuario;
  }

  async function listar(identidade) {
    const usuario = await usuarioAtual(identidade);
    const itens = await repository.listarItens(usuario.id);
    const ids = [...new Set(itens.map((item) => item.peca_id).filter(Boolean))];
    if (!ids.length) return { message: 'Sua lista de desejos está vazia.', total: 0, itens: [], pecas: [] };
    const pecas = ordenarPecasPorFavoritos(await repository.listarPecas(ids), itens);
    return { message: 'Lista de desejos carregada com sucesso.', total: pecas.length, itens, pecas };
  }

  async function status(identidade, valor) {
    const usuario = await usuarioAtual(identidade);
    const pecaId = validarIdPeca(valor);
    const item = await repository.buscarItem(usuario.id, pecaId);
    return { peca_id: pecaId, in_wish: Boolean(item), item: item || null };
  }

  async function adicionar(identidade, valor) {
    const usuario = await usuarioAtual(identidade);
    const pecaId = validarIdPeca(valor);
    const peca = await repository.buscarPeca(pecaId);
    if (!peca) throw new AppError(404, 'Peça não encontrada.');
    const existente = await repository.buscarItem(usuario.id, pecaId);
    if (existente) return {
      status: 200,
      data: { message: 'Essa peça já está na sua lista de desejos.', item: existente, peca },
    };
    const item = await repository.adicionar(usuario.id, pecaId);
    return {
      status: 201,
      data: { message: 'Peça adicionada à sua lista de desejos.', item, peca },
    };
  }

  async function remover(identidade, valor) {
    const usuario = await usuarioAtual(identidade);
    const pecaId = validarIdPeca(valor);
    await repository.remover(usuario.id, pecaId);
    return { message: 'Peça removida da sua lista de desejos.', peca_id: pecaId };
  }

  return Object.freeze({ adicionar, listar, remover, status });
}

module.exports = criarFavoritosUseCases;
