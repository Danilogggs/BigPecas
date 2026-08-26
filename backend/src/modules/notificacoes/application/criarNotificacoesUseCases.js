const AppError = require('../../../utils/AppError');
const { obterEmailAutenticado } = require('../domain/notificacao');

function criarNotificacoesUseCases({ repository }) {
  async function usuarioAtual(authUser) {
    const usuario = await repository.buscarUsuario(obterEmailAutenticado(authUser));
    if (!usuario?.id) throw new AppError(404, 'Usuário não encontrado.');
    return usuario;
  }

  async function contar(authUser) {
    const usuario = await usuarioAtual(authUser);
    return { count: await repository.contarNaoLidas(usuario.id) };
  }

  async function listar(authUser) {
    const usuario = await usuarioAtual(authUser);
    return { notificacoes: await repository.listar(usuario.id) };
  }

  async function marcarComoLida(authUser, id) {
    const usuario = await usuarioAtual(authUser);
    const notificacao = await repository.marcarComoLida(id, usuario.id);
    if (!notificacao) throw new AppError(404, 'Notificação não encontrada.');
    return { notificacao };
  }

  return Object.freeze({ contar, listar, marcarComoLida });
}

module.exports = criarNotificacoesUseCases;
