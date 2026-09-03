const AppError = require('../../../utils/AppError');
const {
  calcularScoreHistorico,
  calcularSimilaridadePeca,
  criarPaginacao,
  limparPayload,
  montarFornecedorPublico,
  montarPayloadPeca,
  obterEmailUsuarioAutenticado,
  sanitizarAtualizacao,
  usuarioPodeCadastrarPeca,
  validarId,
  validarNumeroConsulta,
  validarOrdenacao,
  validarPayloadCadastro,
  validarPermissaoCadastroPeca,
} = require('../domain/peca');

function criarPecasUseCases({ repository }) {
  async function obterFornecedor(identidade) {
    const email = obterEmailUsuarioAutenticado(identidade);
    if (!email) {
      throw new AppError(401, 'Não foi possível identificar o e-mail do usuário logado.');
    }

    const fornecedor = await repository.buscarFornecedorPorEmail(email);
    if (!fornecedor?.id) {
      throw new AppError(404, 'Usuário fornecedor não encontrado na tabela users.');
    }
    return fornecedor;
  }

  async function cadastrar({ identidade, usuarioAutenticado, dados }) {
    const fornecedor = await obterFornecedor(identidade);
    validarPermissaoCadastroPeca(fornecedor, usuarioAutenticado);
    const payload = limparPayload(montarPayloadPeca(dados, fornecedor.id));
    validarPayloadCadastro(payload);
    const peca = await repository.criarPeca(payload);

    return { id: peca?.id, message: 'Peça cadastrada e enviada para avaliação. Ela ficará pública após aprovação.', peca };
  }

  async function listar({ identidade, query }) {
    const {
      nome, categoria_id, material_id, num_serie, condicao, min_preco, max_preco,
      oem_number, min_estoque, fornecedor_id, sort, ordem, minhas_pecas, page, limit,
    } = query;

    let fornecedorAtualId = null;
    if (minhas_pecas === 'true') {
      fornecedorAtualId = (await obterFornecedor(identidade)).id;
    }

    const paginacao = criarPaginacao(page, limit);
    const resultado = await repository.listarPecas({
      filtros: {
        fornecedorAtualId,
        moeda: query.moeda || 'BRL',
        fornecedorId: fornecedor_id
          ? validarNumeroConsulta(fornecedor_id, 'fornecedor')
          : null,
        categoriaId: categoria_id ? validarNumeroConsulta(categoria_id, 'categoria') : null,
        materialId: material_id ? validarNumeroConsulta(material_id, 'material') : null,
        condicao,
        oemNumber: oem_number,
        numeroSerie: num_serie,
        nome,
        precoMinimo: min_preco !== undefined && min_preco !== ''
          ? validarNumeroConsulta(min_preco, 'preço mínimo')
          : null,
        precoMaximo: max_preco !== undefined && max_preco !== ''
          ? validarNumeroConsulta(max_preco, 'preço máximo')
          : null,
        estoqueMinimo: min_estoque !== undefined && min_estoque !== ''
          ? validarNumeroConsulta(min_estoque, 'estoque mínimo')
          : null,
      },
      ordenacao: {
        campo: validarOrdenacao(sort),
        ascendente: ordem && String(ordem).toLowerCase() === 'asc',
      },
      paginacao,
    });

    return { ...resultado, paginacao };
  }

  async function listarFornecedoresRecomendados(limiteInformado) {
    const limite = validarNumeroConsulta(limiteInformado, 'limite') || 4;
    const fornecedores = (await repository.listarFornecedores()).filter(usuarioPodeCadastrarPeca);
    if (fornecedores.length === 0) return { total: 0, fornecedores: [] };

    const idsFornecedores = fornecedores.map((fornecedor) => fornecedor.id);
    const [pecas, avaliacoes] = await Promise.all([
      repository.listarPecasDosFornecedores(idsFornecedores),
      repository.resumirAvaliacoesFornecedores(idsFornecedores),
    ]);
    const ranking = fornecedores
      .map((fornecedor) => montarFornecedorPublico(
        fornecedor,
        pecas.filter((peca) => String(peca.fornecedor_id) === String(fornecedor.id)),
        avaliacoes.get(String(fornecedor.id)),
      ))
      .filter((fornecedor) => fornecedor.total_pecas > 0)
      .sort((a, b) => b.total_avaliacoes - a.total_avaliacoes || b.media_avaliacoes - a.media_avaliacoes)
      .slice(0, limite);

    return { total: ranking.length, fornecedores: ranking };
  }

  async function obterPerfilFornecedor(idInformado) {
    const id = validarId(idInformado);
    const fornecedor = await repository.buscarFornecedorPorId(id);
    if (!fornecedor) throw new AppError(404, 'Fornecedor não encontrado.');
    if (!usuarioPodeCadastrarPeca(fornecedor)) {
      throw new AppError(404, 'Este usuário não possui perfil de vendedor.');
    }

    const [pecas, avaliacoes] = await Promise.all([
      repository.listarPecasPorFornecedor(id),
      repository.resumirAvaliacoesFornecedores([id]),
    ]);
    return { fornecedor: montarFornecedorPublico(fornecedor, pecas, avaliacoes.get(String(id))), pecas };
  }

  async function recomendarPorHistorico(identidade, limiteInformado) {
    const email = obterEmailUsuarioAutenticado(identidade);
    if (!email) throw new AppError(401, 'Não foi possível identificar o usuário autenticado.');
    const usuario = await repository.buscarUsuarioPorEmail(email);
    if (!usuario?.id) throw new AppError(404, 'Usuário não encontrado.');

    const limite = Math.min(validarNumeroConsulta(limiteInformado, 'limite') || 8, 20);
    const compras = await repository.listarComprasDoUsuario(usuario.id);
    const idsComprados = [...new Set(compras.flatMap((pedido) =>
      (Array.isArray(pedido.itens) ? pedido.itens : []).map((item) => item?.id).filter(Boolean),
    ).map(String))];
    const [compradas, candidatas] = await Promise.all([
      repository.listarPecasPorIds(idsComprados),
      repository.listarPecasPublicadas(),
    ]);
    const compradasIds = new Set(idsComprados);
    const disponiveis = candidatas.filter((peca) => !compradasIds.has(String(peca.id)));

    const recomendacoes = (compradas.length
      ? disponiveis.map((peca) => ({
        ...peca,
        score_recomendacao: calcularScoreHistorico(compradas, peca),
        origem_recomendacao: 'historico_compras',
      })).filter((peca) => peca.score_recomendacao > 0)
      : disponiveis.map((peca) => ({
        ...peca,
        score_recomendacao: 0,
        origem_recomendacao: 'catalogo_popular',
      })))
      .sort((a, b) => b.score_recomendacao - a.score_recomendacao || Number(b.id) - Number(a.id))
      .slice(0, limite);

    return { baseado_em_historico: compradas.length > 0, total: recomendacoes.length, recomendacoes };
  }

  async function recomendar(idInformado, limiteInformado) {
    const id = validarId(idInformado);
    const limite = validarNumeroConsulta(limiteInformado, 'limite') || 4;
    const pecaBase = await repository.buscarPecaPorId(id);
    if (!pecaBase || pecaBase.status_publicacao !== 'publicada') {
      throw new AppError(404, 'Peça base não encontrada para gerar recomendações.');
    }

    const recomendacoes = (await repository.buscarCandidatasRecomendacao(pecaBase, id))
      .map((peca) => ({
        ...peca,
        score_recomendacao: calcularSimilaridadePeca(pecaBase, peca),
      }))
      .filter((peca) => peca.score_recomendacao > 0)
      .sort((a, b) => b.score_recomendacao - a.score_recomendacao)
      .slice(0, limite);

    return { peca_base_id: id, total: recomendacoes.length, recomendacoes };
  }

  async function detalhar(idInformado, identidade) {
    const id = validarId(idInformado);
    const peca = await repository.buscarPecaPorId(id);
    if (!peca) throw new AppError(404, 'Peça não encontrada.');
    if (peca.status_publicacao !== 'publicada') {
      const email = obterEmailUsuarioAutenticado(identidade);
      const dono = email ? await repository.buscarFornecedorPorEmail(email) : null;
      if (!dono || String(dono.id) !== String(peca.fornecedor_id)) throw new AppError(404, 'Peça não encontrada.');
    }
    return peca;
  }

  async function atualizar({ identidade, id: idInformado, dados }) {
    const id = validarId(idInformado);
    const fornecedor = await obterFornecedor(identidade);
    const updates = sanitizarAtualizacao(dados);
    const pecaAtual = await repository.buscarPecaPorId(id);

    if (!pecaAtual) throw new AppError(404, 'Peça não encontrada.');
    if (String(pecaAtual.fornecedor_id) !== String(fornecedor.id)) {
      throw new AppError(403, 'Você só pode atualizar peças cadastradas por você.');
    }

    const peca = await repository.atualizarPeca(id, updates);
    return { id, message: 'Peça atualizada com sucesso!', peca };
  }

  async function deletar({ identidade, id: idInformado }) {
    const id = validarId(idInformado);
    const fornecedor = await obterFornecedor(identidade);
    const peca = await repository.buscarPecaPorId(id);

    if (!peca) throw new AppError(404, 'Peça não encontrada.');
    if (String(peca.fornecedor_id) !== String(fornecedor.id)) {
      throw new AppError(403, 'Você só pode deletar peças cadastradas por você.');
    }

    await repository.deletarPeca(id);
    return { message: 'Peça deletada com sucesso!' };
  }

  return Object.freeze({
    atualizar,
    cadastrar,
    deletar,
    detalhar,
    listar,
    listarCategorias: () => repository.listarCategorias(),
    listarFornecedoresRecomendados,
    listarMateriais: () => repository.listarMateriais(),
    obterPerfilFornecedor,
    recomendar,
    recomendarPorHistorico,
  });
}

module.exports = criarPecasUseCases;
