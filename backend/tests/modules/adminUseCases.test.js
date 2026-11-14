const criarAdminUseCases = require('../../src/modules/admin/application/criarAdminUseCases');

const tabelas = { avaliacoesProduto: 'avaliacoes_produto', avaliacoesFornecedor: 'avaliacoes_fornecedor' };
const ok = (data) => ({ data, error: null });
const falha = (message = 'db') => ({ data: null, error: new Error(message) });
const ADMIN = { id: 1 };

function criar(overrides = {}) {
  const repository = {
    buscarPreferencias: jest.fn(async () => null),
    salvarPreferencias: jest.fn(async (id, config) => ({ config })),
    listarUsuarios: jest.fn(async () => ({ data: [{ id: 1 }], count: 1, error: null })),
    buscarUsuarioPorEmail: jest.fn(async () => ok(null)),
    criarContaAdmin: jest.fn(async () => ok({ id: 9 })),
    contarAdmins: jest.fn(async () => 2),
    atualizarPermissao: jest.fn(async () => ok({ id: 2 })),
    editarUsuario: jest.fn(async () => ok({ id: 2 })),
    removerUsuario: jest.fn(async () => ok({ id: 2, email: 'a@b.com' })),
    removerAuthPorEmail: jest.fn(async () => undefined),
    editarPeca: jest.fn(async () => ok({ id: 3 })),
    editarAvaliacao: jest.fn(async () => ok({ id: 4 })),
    listarPecas: jest.fn(async () => ({ data: null, count: null, error: null })),
    removerPeca: jest.fn(async () => ok({ id: 3 })),
    removerPecaPermanente: jest.fn(async () => ok(true)),
    buscarUsuarioPorId: jest.fn(async () => ok({ id: 2, email: 'a@b.com' })),
    removerUsuarioPermanente: jest.fn(async () => ok(true)),
    listarPedidos: jest.fn(async () => ({ data: [], count: 0, error: null })),
    buscarPedido: jest.fn(async () => ok({ id: 5, historico: [{ status: 'pago' }] })),
    atualizarPedido: jest.fn(async (id, dados) => ok({ id, ...dados })),
    listarAvaliacoes: jest.fn(async () => ({ data: [], count: 0, error: null })),
    removerAvaliacao: jest.fn(async () => ok({ id: 4 })),
    obterDashboard: jest.fn(),
    obterDadosGerenciais: jest.fn(),
    ...overrides,
  };
  const sincronizarStatusVendas = jest.fn(async () => undefined);
  return { useCases: criarAdminUseCases({ repository, tabelas, sincronizarStatusVendas }), repository, sincronizarStatusVendas };
}

const rejeita = (promessa, status) => expect(promessa).rejects.toMatchObject({ statusCode: status });

describe('preferencias e listagens', () => {
  test('usa widgets padrao quando nao ha preferencias e salva configuracao valida', async () => {
    const { useCases, repository } = criar();
    await expect(useCases.obterPreferencias(ADMIN)).resolves.toMatchObject({ updated_at: null, config: { widgets: expect.any(Array) } });
    repository.buscarPreferencias.mockResolvedValueOnce({ config: { widgets: ['pedidos'] }, updated_at: 'x' });
    await expect(useCases.obterPreferencias(ADMIN)).resolves.toEqual({ config: { widgets: ['pedidos'] }, updated_at: 'x' });
    await expect(useCases.salvarPreferencias(ADMIN, { widgets: ['pedidos'] })).resolves.toMatchObject({ config: { widgets: ['pedidos'] } });
    await rejeita(useCases.salvarPreferencias(ADMIN, {}), 400);
  });

  test('lista usuarios com filtro de admin e propaga erro', async () => {
    const { useCases, repository } = criar();
    await expect(useCases.listarUsuarios({ is_admin: 'true', search: 'a,(b)' })).resolves.toMatchObject({ pagination: { total: 1 } });
    expect(repository.listarUsuarios).toHaveBeenCalledWith(expect.objectContaining({ isAdmin: true, search: 'ab' }));
    await useCases.listarUsuarios({ is_admin: 'false' });
    expect(repository.listarUsuarios).toHaveBeenLastCalledWith(expect.objectContaining({ isAdmin: false }));
    await useCases.listarUsuarios({});
    expect(repository.listarUsuarios).toHaveBeenLastCalledWith(expect.objectContaining({ isAdmin: undefined }));
    repository.listarUsuarios.mockResolvedValueOnce({ error: new Error('x') });
    await expect(useCases.listarUsuarios({})).rejects.toThrow('x');
    await expect(useCases.listarPecas({})).resolves.toEqual({ data: [], pagination: { page: 1, limit: 20, total: 0 } });
    await useCases.listarPedidos({ status: 'pago' });
    expect(repository.listarPedidos).toHaveBeenCalledWith(expect.objectContaining({ status: 'pago' }));
    await useCases.listarPedidos({});
    await rejeita(useCases.listarPedidos({ status: 'x' }), 400);
    await useCases.listarAvaliacoes('fornecedores', {});
    expect(repository.listarAvaliacoes).toHaveBeenCalledWith('avaliacoes_fornecedor', expect.any(Object));
  });
});

describe('contas administrativas', () => {
  test('valida dados de nova conta', async () => {
    const { useCases } = criar();
    await rejeita(useCases.criarContaAdmin(), 400);
    await rejeita(useCases.criarContaAdmin({ full_name: 'Ana Souza', email: 'x' }), 400);
    await rejeita(useCases.criarContaAdmin({ full_name: 'Ana Souza', email: 'a@b.com', password: 'curta' }), 400);
  });

  test('cria conta e trata duplicidade', async () => {
    const dados = { full_name: '  Ana   Souza ', email: 'A@B.COM', password: 'senha1234' };
    const { useCases, repository } = criar();
    await expect(useCases.criarContaAdmin(dados)).resolves.toMatchObject({ usuario: { id: 9 } });
    expect(repository.criarContaAdmin).toHaveBeenCalledWith({ email: 'a@b.com', password: 'senha1234', fullName: 'Ana Souza' });
    repository.buscarUsuarioPorEmail.mockResolvedValueOnce(falha('busca'));
    await expect(useCases.criarContaAdmin(dados)).rejects.toThrow('busca');
    repository.buscarUsuarioPorEmail.mockResolvedValueOnce(ok({ id: 1 }));
    await rejeita(useCases.criarContaAdmin(dados), 409);
    repository.criarContaAdmin.mockResolvedValueOnce(falha('User already registered'));
    await rejeita(useCases.criarContaAdmin(dados), 409);
    repository.criarContaAdmin.mockResolvedValueOnce(falha('outro'));
    await expect(useCases.criarContaAdmin(dados)).rejects.toThrow('outro');
    repository.criarContaAdmin.mockResolvedValueOnce({ data: null, error: {} });
    await expect(useCases.criarContaAdmin(dados)).rejects.toEqual({});
  });

  test('atualiza permissao protegendo o ultimo admin', async () => {
    const { useCases, repository } = criar();
    await expect(useCases.atualizarAdmin('2', true)).resolves.toMatchObject({ usuario: { id: 2 } });
    await rejeita(useCases.atualizarAdmin('2', 'sim'), 400);
    repository.contarAdmins.mockResolvedValueOnce(1);
    await rejeita(useCases.atualizarAdmin('2', false), 409);
    await useCases.atualizarAdmin('2', false);
    repository.atualizarPermissao.mockResolvedValueOnce(falha('perm'));
    await expect(useCases.atualizarAdmin('2', true)).rejects.toThrow('perm');
    repository.atualizarPermissao.mockResolvedValueOnce(ok(null));
    await rejeita(useCases.atualizarAdmin('2', true), 404);
    await rejeita(useCases.atualizarAdmin('abc', true), 400);
  });

  test('edita usuario com validacao de email', async () => {
    const { useCases, repository } = criar();
    await rejeita(useCases.editarUsuario('2'), 400);
    await rejeita(useCases.editarUsuario('2', { email: 'invalido' }), 400);
    await useCases.editarUsuario('2', { email: ' A@B.COM ', full_name: 'Ana', telefone: '' });
    expect(repository.editarUsuario).toHaveBeenCalledWith(2, { email: 'a@b.com', full_name: 'Ana', telefone: null });
    repository.editarUsuario.mockResolvedValueOnce(falha('edit'));
    await expect(useCases.editarUsuario('2', { nome_loja: 'X' })).rejects.toThrow('edit');
    repository.editarUsuario.mockResolvedValueOnce(ok(null));
    await rejeita(useCases.editarUsuario('2', { nome_loja: 'X' }), 404);
  });

  test('remove usuario de forma logica e permanente', async () => {
    const { useCases, repository } = criar();
    await rejeita(useCases.removerUsuario('1', ADMIN), 409);
    await expect(useCases.removerUsuario('2', ADMIN)).resolves.toMatchObject({ message: expect.any(String) });
    expect(repository.removerAuthPorEmail).toHaveBeenCalledWith('a@b.com');
    repository.removerUsuario.mockResolvedValueOnce(falha('rm'));
    await expect(useCases.removerUsuario('2', ADMIN)).rejects.toThrow('rm');
    repository.removerUsuario.mockResolvedValueOnce(ok(null));
    await rejeita(useCases.removerUsuario('2', ADMIN), 404);

    await rejeita(useCases.removerUsuarioPermanente('1', ADMIN), 409);
    await useCases.removerUsuarioPermanente('2', ADMIN);
    repository.buscarUsuarioPorId.mockResolvedValueOnce(falha('busca'));
    await expect(useCases.removerUsuarioPermanente('2', ADMIN)).rejects.toThrow('busca');
    repository.buscarUsuarioPorId.mockResolvedValueOnce(ok(null));
    await rejeita(useCases.removerUsuarioPermanente('2', ADMIN), 404);
    repository.removerUsuarioPermanente.mockResolvedValueOnce(falha('perm'));
    await expect(useCases.removerUsuarioPermanente('2', ADMIN)).rejects.toThrow('perm');
    repository.removerUsuarioPermanente.mockResolvedValueOnce(ok(null));
    await rejeita(useCases.removerUsuarioPermanente('2', ADMIN), 404);
  });
});

describe('pecas, avaliacoes e pedidos', () => {
  test('edita peca validando nome, preco e estoque', async () => {
    const { useCases, repository } = criar();
    await rejeita(useCases.editarPeca('3'), 400);
    await rejeita(useCases.editarPeca('3', { nome_peca: ' ' }), 400);
    await rejeita(useCases.editarPeca('3', { preco: 0 }), 400);
    await rejeita(useCases.editarPeca('3', { preco: 'x' }), 400);
    await rejeita(useCases.editarPeca('3', { estoque_atual: 1.5 }), 400);
    await rejeita(useCases.editarPeca('3', { estoque_atual: -1 }), 400);
    await useCases.editarPeca('3', { nome_peca: 'Farol', preco: '10.5', estoque_atual: '2' });
    expect(repository.editarPeca).toHaveBeenCalledWith(3, { nome_peca: 'Farol', preco_base: 10.5, estoque_atual: 2 });
    repository.editarPeca.mockResolvedValueOnce(falha('peca'));
    await expect(useCases.editarPeca('3', { estoque_atual: 1 })).rejects.toThrow('peca');
    repository.editarPeca.mockResolvedValueOnce(ok(null));
    await rejeita(useCases.editarPeca('3', { estoque_atual: 1 }), 404);
  });

  test('remove pecas de forma logica e permanente', async () => {
    const { useCases, repository } = criar();
    await expect(useCases.removerPeca('3')).resolves.toMatchObject({ peca: { id: 3 } });
    repository.removerPeca.mockResolvedValueOnce(falha('rm'));
    await expect(useCases.removerPeca('3')).rejects.toThrow('rm');
    repository.removerPeca.mockResolvedValueOnce(ok(null));
    await rejeita(useCases.removerPeca('3'), 404);
    await useCases.removerPecaPermanente('3');
    repository.removerPecaPermanente.mockResolvedValueOnce(falha('perm'));
    await expect(useCases.removerPecaPermanente('3')).rejects.toThrow('perm');
    repository.removerPecaPermanente.mockResolvedValueOnce(ok(null));
    await rejeita(useCases.removerPecaPermanente('3'), 404);
  });

  test('edita e remove avaliacoes', async () => {
    const { useCases, repository } = criar();
    await rejeita(useCases.editarAvaliacao('produtos', '4', { nota: 6 }), 400);
    await rejeita(useCases.editarAvaliacao('produtos', '4', { nota: 2, comentario: 'x'.repeat(1001) }), 400);
    await rejeita(useCases.editarAvaliacao('outro', '4', { nota: 2 }), 400);
    await useCases.editarAvaliacao('produtos', '4', { nota: '5' });
    expect(repository.editarAvaliacao).toHaveBeenCalledWith('avaliacoes_produto', 4, { nota: 5, comentario: null });
    repository.editarAvaliacao.mockResolvedValueOnce(falha('av'));
    await expect(useCases.editarAvaliacao('produtos', '4', { nota: 3, comentario: 'ok' })).rejects.toThrow('av');
    repository.editarAvaliacao.mockResolvedValueOnce(ok(null));
    await rejeita(useCases.editarAvaliacao('produtos', '4', { nota: 3 }), 404);

    await useCases.removerAvaliacao('fornecedores', '4');
    repository.removerAvaliacao.mockResolvedValueOnce(falha('rm'));
    await expect(useCases.removerAvaliacao('produtos', '4')).rejects.toThrow('rm');
    repository.removerAvaliacao.mockResolvedValueOnce(ok(null));
    await rejeita(useCases.removerAvaliacao('produtos', '4'), 404);
  });

  test('atualiza status do pedido registrando historico', async () => {
    const { useCases, repository, sincronizarStatusVendas } = criar();
    await expect(useCases.atualizarStatus({ id: 5, status: 'enviado', admin: ADMIN })).resolves.toMatchObject({ pedido: { status: 'enviado' } });
    expect(repository.atualizarPedido.mock.calls[0][1].historico).toHaveLength(2);
    expect(sincronizarStatusVendas).toHaveBeenCalled();
    repository.buscarPedido.mockResolvedValueOnce(ok({ id: 5, historico: null }));
    await useCases.atualizarStatus({ id: 5, status: 'pago', admin: ADMIN });
    expect(repository.atualizarPedido.mock.calls[1][1].historico).toHaveLength(1);
    await rejeita(useCases.atualizarStatus({ id: 5, admin: ADMIN }), 400);
    repository.buscarPedido.mockResolvedValueOnce(falha('busca'));
    await expect(useCases.atualizarStatus({ id: 5, status: 'pago', admin: ADMIN })).rejects.toThrow('busca');
    repository.buscarPedido.mockResolvedValueOnce(ok(null));
    await rejeita(useCases.atualizarStatus({ id: 5, status: 'pago', admin: ADMIN }), 404);
    repository.atualizarPedido.mockResolvedValueOnce(falha('upd'));
    await expect(useCases.atualizarStatus({ id: 5, status: 'pago', admin: ADMIN })).rejects.toThrow('upd');
  });
});
