const AppError = require('../../../utils/AppError');
const {
  WIDGETS_PADRAO, paginacao, sanitizarBusca, tabelaAvaliacao,
  validarId, validarStatus, validarWidgets,
} = require('../domain/administracao');

function criarAdminUseCases({ repository, tabelas, sincronizarStatusVendas }) {
  const respostaLista = (resultado, page, limit) => {
    if (resultado.error) throw resultado.error;
    return { data: resultado.data || [], pagination: { page, limit, total: resultado.count || 0 } };
  };

  async function obterPreferencias(admin) {
    const data = await repository.buscarPreferencias(admin.id);
    return { config: data?.config || { widgets: WIDGETS_PADRAO }, updated_at: data?.updated_at || null };
  }

  async function salvarPreferencias(admin, dados) {
    const config = { widgets: validarWidgets(dados?.widgets) };
    const data = await repository.salvarPreferencias(admin.id, config);
    return { message: 'Painel personalizado com sucesso.', ...data };
  }

  async function listarUsuarios(query) {
    const pagina = paginacao(query);
    const isAdmin = query.is_admin === 'true' || query.is_admin === 'false'
      ? query.is_admin === 'true' : undefined;
    const resultado = await repository.listarUsuarios({
      ...pagina, search: sanitizarBusca(query.search), isAdmin,
    });
    return respostaLista(resultado, pagina.page, pagina.limit);
  }

  async function atualizarAdmin(id, valor) {
    const userId = validarId(id, 'usuario');
    if (typeof valor !== 'boolean') throw new AppError(400, 'Informe is_admin como true ou false.');
    if (!valor && await repository.contarAdmins() <= 1) {
      throw new AppError(409, 'Nao e permitido remover o ultimo administrador.');
    }
    const { data, error } = await repository.atualizarPermissao(userId, valor);
    if (error) throw error;
    if (!data) throw new AppError(404, 'Usuario nao encontrado.');
    return { message: 'Permissao administrativa atualizada.', usuario: data };
  }

  async function listarPecas(query) {
    const pagina = paginacao(query);
    const resultado = await repository.listarPecas({ ...pagina, search: sanitizarBusca(query.search) });
    return respostaLista(resultado, pagina.page, pagina.limit);
  }

  async function removerPeca(valor) {
    const { data, error } = await repository.removerPeca(validarId(valor, 'peca'));
    if (error) throw error;
    if (!data) throw new AppError(404, 'Peca nao encontrada.');
    return { message: 'Peca removida pelo administrador.', peca: data };
  }

  async function listarPedidos(query) {
    const pagina = paginacao(query);
    const status = query.status ? validarStatus(query.status) : '';
    const resultado = await repository.listarPedidos({ ...pagina, status });
    return respostaLista(resultado, pagina.page, pagina.limit);
  }

  async function atualizarStatus({ id, status, admin }) {
    validarStatus(String(status || ''));
    const { data: atual, error: findError } = await repository.buscarPedido(id);
    if (findError) throw findError;
    if (!atual) throw new AppError(404, 'Pedido nao encontrado.');
    const historico = [...(Array.isArray(atual.historico) ? atual.historico : []), {
      status, data: new Date().toISOString(), alterado_por_admin: admin.id,
    }];
    const { data, error } = await repository.atualizarPedido(id, { status, historico });
    if (error) throw error;
    await sincronizarStatusVendas(data);
    return { message: 'Status atualizado pelo administrador.', pedido: data };
  }

  async function listarAvaliacoes(tipo, query) {
    const table = tabelaAvaliacao(tipo, tabelas);
    const pagina = paginacao(query);
    const resultado = await repository.listarAvaliacoes(table, pagina);
    return respostaLista(resultado, pagina.page, pagina.limit);
  }

  async function removerAvaliacao(tipo, valor) {
    const table = tabelaAvaliacao(tipo, tabelas);
    const { data, error } = await repository.removerAvaliacao(table, validarId(valor, 'avaliacao'));
    if (error) throw error;
    if (!data) throw new AppError(404, 'Avaliacao nao encontrada.');
    return { message: 'Avaliacao removida pelo administrador.' };
  }

  return Object.freeze({
    atualizarAdmin, atualizarStatus, listarAvaliacoes, listarPecas, listarPedidos,
    listarUsuarios, obterDashboard: repository.obterDashboard, obterPreferencias,
    removerAvaliacao, removerPeca, salvarPreferencias,
  });
}

module.exports = criarAdminUseCases;
