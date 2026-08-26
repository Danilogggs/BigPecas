const AppError = require('../../../utils/AppError');
const {
  agruparFornecedores, media, montarEstadoAvaliacoes, normalizarComentario,
  resumoAvaliacoes, validarCompraEntregue, validarNota,
} = require('../domain/avaliacao');

function criarAvaliacoesUseCases({ repository, garantirVendasDoPedido }) {
  async function usuarioAtual(authUser) {
    const email = authUser?.email || authUser?.user?.email;
    if (!email) throw new AppError(401, 'Não foi possível identificar o usuário autenticado.');
    const usuario = await repository.buscarUsuario(email);
    if (!usuario?.id) throw new AppError(404, 'Usuário não encontrado.');
    return usuario;
  }

  async function carregarCompra(pedidoId, compradorId) {
    const pedido = await repository.buscarPedido(pedidoId);
    if (!pedido || String(pedido.user_id) !== String(compradorId)) {
      throw new AppError(404, 'Compra não encontrada.');
    }
    return garantirVendasDoPedido(pedido);
  }

  async function obterEstado(authUser, pedidoId) {
    const usuario = await usuarioAtual(authUser);
    const pedido = await carregarCompra(pedidoId, usuario.id);
    const avaliacoes = await repository.listarDoPedido(pedido.id, usuario.id);
    return montarEstadoAvaliacoes(pedido, avaliacoes.fornecedores, avaliacoes.produtos);
  }

  async function avaliarFornecedor(authUser, body) {
    const usuario = await usuarioAtual(authUser);
    const pedido = await carregarCompra(body.pedido_id, usuario.id);
    validarCompraEntregue(pedido);
    const fornecedor = agruparFornecedores(pedido).find(
      (item) => String(item.fornecedor_id) === String(body.fornecedor_id),
    );
    if (!fornecedor?.venda_id) throw new AppError(400, 'O vendedor informado não pertence a esta compra.');
    const existente = await repository.buscarFornecedorExistente(pedido.id, fornecedor.fornecedor_id, usuario.id);
    if (existente.error) throw existente.error;
    if (existente.data) throw new AppError(409, 'Este vendedor já foi avaliado nesta compra.');
    const resultado = await repository.inserirFornecedor({
      pedido_id: pedido.id,
      fornecedor_id: fornecedor.fornecedor_id,
      comprador_id: usuario.id,
      venda_id: fornecedor.venda_id,
      nota: validarNota(body.nota),
      comentario: normalizarComentario(body.comentario),
      qualidade_peca: validarNota(body.qualidade_peca, 'qualidade da peça'),
      comunicacao: validarNota(body.comunicacao, 'comunicação'),
      rapidez_entrega: validarNota(body.rapidez_entrega, 'rapidez da entrega'),
      embalagem: validarNota(body.embalagem, 'embalagem'),
      verificada: true,
      data_avaliacao: new Date().toISOString(),
    });
    if (resultado.error?.code === '23505') throw new AppError(409, 'Este vendedor já foi avaliado nesta compra.');
    if (resultado.error) throw resultado.error;
    return resultado.data;
  }

  async function avaliarProduto(authUser, body) {
    const usuario = await usuarioAtual(authUser);
    const pedido = await carregarCompra(body.pedido_id, usuario.id);
    validarCompraEntregue(pedido);
    const item = pedido.itens.find((produto) => body.venda_id
      ? String(produto.venda_id) === String(body.venda_id)
      : String(produto.id) === String(body.peca_id));
    if (!item?.venda_id) throw new AppError(400, 'O produto informado não pertence a esta compra.');
    const existente = await repository.buscarProdutoExistente(pedido.id, item.venda_id, usuario.id);
    if (existente.error) throw existente.error;
    if (existente.data) throw new AppError(409, 'Este produto já foi avaliado nesta compra.');
    const resultado = await repository.inserirProduto({
      pedido_id: pedido.id,
      venda_id: item.venda_id,
      peca_id: item.id,
      fornecedor_id: item.fornecedor_id,
      comprador_id: usuario.id,
      nota: validarNota(body.nota),
      comentario: normalizarComentario(body.comentario),
      verificada: true,
      data_avaliacao: new Date().toISOString(),
    });
    if (resultado.error?.code === '23505') throw new AppError(409, 'Este produto já foi avaliado nesta compra.');
    if (resultado.error) throw resultado.error;
    return resultado.data;
  }

  async function listarFornecedor(id) {
    const avaliacoes = await repository.listarFornecedor(id);
    return {
      resumo: {
        ...resumoAvaliacoes(avaliacoes),
        qualidade_peca: media(avaliacoes, 'qualidade_peca'),
        comunicacao: media(avaliacoes, 'comunicacao'),
        rapidez_entrega: media(avaliacoes, 'rapidez_entrega'),
        embalagem: media(avaliacoes, 'embalagem'),
      },
      avaliacoes,
    };
  }

  async function listarProduto(id) {
    const avaliacoes = await repository.listarProduto(id);
    return { resumo: resumoAvaliacoes(avaliacoes), avaliacoes };
  }

  return Object.freeze({ avaliarFornecedor, avaliarProduto, listarFornecedor, listarProduto, obterEstado });
}

module.exports = criarAvaliacoesUseCases;
