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

  async function criarContaAdmin(dados = {}) {
    const fullName = String(dados.full_name || '').trim().replace(/\s+/g, ' ');
    const email = String(dados.email || '').trim().toLowerCase();
    const password = String(dados.password || '');
    if (fullName.length < 3) throw new AppError(400, 'Informe o nome completo do administrador.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError(400, 'Informe um email valido.');
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) {
      throw new AppError(400, 'A senha deve ter no minimo 8 caracteres, com letras e numeros.');
    }
    const existente = await repository.buscarUsuarioPorEmail(email);
    if (existente.error) throw existente.error;
    if (existente.data) throw new AppError(409, 'Ja existe uma conta com este email.');
    const { data, error } = await repository.criarContaAdmin({ email, password, fullName });
    if (error) {
      if (/already|registered|exists/i.test(error.message || '')) {
        throw new AppError(409, 'Ja existe uma conta com este email.');
      }
      throw error;
    }
    return { message: 'Conta de administrador criada com sucesso.', usuario: data };
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

  async function editarUsuario(id, dados = {}) {
    const permitidos = ['full_name', 'email', 'telefone', 'nome_loja'];
    const payload = Object.fromEntries(permitidos.filter((campo) => campo in dados).map((campo) => [campo, String(dados[campo] || '').trim() || null]));
    if (!Object.keys(payload).length) throw new AppError(400, 'Informe ao menos um campo para atualizar.');
    if ('email' in payload) {
      payload.email = String(payload.email || '').toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) throw new AppError(400, 'Informe um email valido.');
    }
    const { data, error } = await repository.editarUsuario(validarId(id, 'usuario'), payload);
    if (error) throw error;
    if (!data) throw new AppError(404, 'Usuario nao encontrado.');
    return { message: 'Usuario atualizado com sucesso.', usuario: data };
  }

  async function removerUsuario(id, admin) {
    const userId = validarId(id, 'usuario');
    if (Number(admin.id) === userId) throw new AppError(409, 'Voce nao pode excluir a propria conta administrativa.');
    const { data, error } = await repository.removerUsuario(userId);
    if (error) throw error;
    if (!data) throw new AppError(404, 'Usuario nao encontrado.');
    await repository.removerAuthPorEmail(data.email);
    return { message: 'Usuario excluido com sucesso.' };
  }

  async function editarPeca(id, dados = {}) {
    const payload = {};
    if ('nome_peca' in dados) payload.nome_peca = String(dados.nome_peca || '').trim();
    if ('preco' in dados) payload.preco_base = Number(dados.preco);
    if ('estoque_atual' in dados) payload.estoque_atual = Number(dados.estoque_atual);
    if (!Object.keys(payload).length || ('nome_peca' in payload && !payload.nome_peca) || (payload.preco_base !== undefined && (!Number.isFinite(payload.preco_base) || payload.preco_base <= 0)) || (payload.estoque_atual !== undefined && (!Number.isInteger(payload.estoque_atual) || payload.estoque_atual < 0))) throw new AppError(400, 'Revise o nome, preco e estoque da peca.');
    const { data, error } = await repository.editarPeca(validarId(id, 'peca'), payload);
    if (error) throw error;
    if (!data) throw new AppError(404, 'Peca nao encontrada.');
    return { message: 'Peca atualizada com sucesso.', peca: data };
  }

  async function editarAvaliacao(tipo, id, dados = {}) {
    const table = tabelaAvaliacao(tipo, tabelas);
    const nota = Number(dados.nota);
    const comentario = String(dados.comentario || '').trim();
    if (!Number.isInteger(nota) || nota < 1 || nota > 5 || comentario.length > 1000) throw new AppError(400, 'Informe nota entre 1 e 5 e comentario de ate 1000 caracteres.');
    const { data, error } = await repository.editarAvaliacao(table, validarId(id, 'avaliacao'), { nota, comentario: comentario || null });
    if (error) throw error;
    if (!data) throw new AppError(404, 'Avaliacao nao encontrada.');
    return { message: 'Avaliacao atualizada com sucesso.', avaliacao: data };
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
    atualizarAdmin, atualizarStatus, criarContaAdmin, editarAvaliacao, editarPeca, editarUsuario,
    listarAvaliacoes, listarPecas, listarPedidos, listarUsuarios,
    obterDashboard: repository.obterDashboard, obterDadosGerenciais: repository.obterDadosGerenciais,
    obterPreferencias,
    removerAvaliacao, removerPeca, removerUsuario, salvarPreferencias,
  });
}

module.exports = criarAdminUseCases;
