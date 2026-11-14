const { createSupabaseMock } = require('../helpers/supabaseMock');
const criarRepositorio = require('../../src/modules/admin/infrastructure/SupabaseAdminRepository');

const tabelas = {
  usuarios: 'users', pecas: 'pecas', pedidos: 'pedidos', preferencias: 'prefs',
  avaliacoesProduto: 'av_prod', avaliacoesFornecedor: 'av_forn',
};

let supabase;
let repo;
beforeEach(() => {
  supabase = createSupabaseMock();
  supabase.rpc = jest.fn(async () => ({ data: true, error: null }));
  repo = criarRepositorio({ supabase, tabelas });
});

test('preferencias: busca, salva e propaga erros', async () => {
  supabase.__queueTable('prefs', { data: { config: {} }, error: null }, { data: null, error: new Error('busca') });
  await expect(repo.buscarPreferencias(1)).resolves.toEqual({ config: {} });
  await expect(repo.buscarPreferencias(1)).rejects.toThrow('busca');
  supabase.__queueTable('prefs', { data: { config: { w: 1 } }, error: null }, { data: null, error: new Error('salva') });
  await expect(repo.salvarPreferencias(1, { w: 1 })).resolves.toEqual({ config: { w: 1 } });
  await expect(repo.salvarPreferencias(1, {})).rejects.toThrow('salva');
});

test('dashboard conta registros e trata contagem nula e erro', async () => {
  ['users', 'pecas', 'pedidos', 'av_prod', 'av_forn'].forEach((t) => supabase.__mockTable(t, { count: 2, error: null }));
  supabase.__queueTable('pecas', { count: null, error: null });
  await expect(repo.obterDashboard()).resolves.toMatchObject({ usuarios: 2, pecas: 0, avaliacoes: 4 });
  supabase.__mockTable('users', { count: null, error: new Error('conta') });
  await expect(repo.contarAdmins()).rejects.toThrow('conta');
});

test('lista usuarios com e sem filtros', async () => {
  supabase.__mockTable('users', { data: [], error: null });
  await repo.listarUsuarios({ search: 'ana', isAdmin: true, from: 0, to: 9 });
  const consulta = supabase.__callsFor('users')[0];
  expect(consulta.argumentos('or')[0]).toContain('ana');
  expect(consulta.argumentos('eq')).toEqual(['is_admin', true]);
  await repo.listarUsuarios({ from: 0, to: 9 });
  expect(supabase.__callsFor('users')[1].operacao('or')).toBeNull();
});

test('dados gerenciais com dados vazios e erros', async () => {
  supabase.__mockTable('pedidos', { data: null, error: null });
  supabase.__mockTable('pecas', { data: [{ id: 1 }], error: null });
  supabase.__mockTable('users', { data: null, error: null });
  await expect(repo.obterDadosGerenciais()).resolves.toEqual({ pedidos: [], pecas: [{ id: 1 }], usuarios: [] });
  for (const tabela of ['pedidos', 'pecas', 'users']) {
    supabase.__queueTable(tabela, { data: null, error: new Error(tabela) });
    await expect(repo.obterDadosGerenciais()).rejects.toThrow(tabela);
  }
});

test('cria conta admin com rollback do auth em caso de erro', async () => {
  supabase.auth.admin.createUser.mockResolvedValueOnce({ data: null, error: new Error('auth') });
  await expect(repo.criarContaAdmin({ email: 'a@b.com' })).resolves.toMatchObject({ error: expect.any(Error) });
  supabase.auth.admin.createUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
  supabase.__queueTable('users', { data: { id: 1 }, error: null }, { data: null, error: new Error('insert') });
  await expect(repo.criarContaAdmin({ email: 'a@b.com', fullName: 'A' })).resolves.toEqual({ data: { id: 1 }, error: null });
  await repo.criarContaAdmin({ email: 'a@b.com', fullName: 'A' });
  expect(supabase.auth.admin.deleteUser).toHaveBeenCalledWith('u1');
  supabase.auth.admin.createUser.mockResolvedValueOnce({ data: {}, error: null });
  supabase.__queueTable('users', { data: null, error: new Error('insert') });
  await repo.criarContaAdmin({ email: 'a@b.com', fullName: 'A' });
  expect(supabase.auth.admin.deleteUser).toHaveBeenCalledTimes(1);
});

test('consultas simples delegam ao supabase', async () => {
  supabase.__mockTable('users', { data: { id: 1 }, error: null });
  supabase.__mockTable('pecas', { data: { id: 2 }, error: null });
  supabase.__mockTable('pedidos', { data: { id: 3 }, error: null });
  supabase.__mockTable('av_prod', { data: { id: 4 }, error: null });
  await repo.buscarUsuarioPorEmail('a@b.com');
  await repo.buscarUsuarioPorId(1);
  await repo.atualizarPermissao(1, true);
  await repo.removerPeca(2);
  await repo.editarPeca(2, {});
  await repo.removerPecaPermanente(2);
  await repo.removerUsuarioPermanente(1);
  await repo.buscarPedido(3);
  await repo.atualizarPedido(3, {});
  await repo.removerAvaliacao('av_prod', 4);
  await repo.editarAvaliacao('av_prod', 4, {});
  await repo.listarPecas({ search: 'farol', from: 0, to: 1 });
  await repo.listarPecas({ from: 0, to: 1 });
  await repo.listarPedidos({ status: 'pago', from: 0, to: 1 });
  await repo.listarPedidos({ from: 0, to: 1 });
  expect(supabase.rpc).toHaveBeenCalledTimes(2);
});

describe('editarUsuario', () => {
  test('retorna quando usuario nao existe', async () => {
    supabase.__queueTable('users', { data: null, error: null });
    await expect(repo.editarUsuario(1, {})).resolves.toEqual({ data: null, error: null });
  });

  test('atualiza auth e perfil, revertendo email em caso de falha', async () => {
    supabase.auth.admin.listUsers.mockResolvedValue({ data: { users: [{ id: 'u1', email: 'A@B.com', user_metadata: { x: 1 } }] }, error: null });
    supabase.auth.admin.updateUserById.mockResolvedValue({ error: null });
    supabase.__queueTable('users', { data: { id: 1, email: 'a@b.com' }, error: null }, { data: { id: 1 }, error: null });
    await expect(repo.editarUsuario(1, { email: 'n@b.com', full_name: 'Novo' })).resolves.toEqual({ data: { id: 1 }, error: null });
    expect(supabase.auth.admin.updateUserById).toHaveBeenCalledWith('u1', { email: 'n@b.com', email_confirm: true, user_metadata: { x: 1, full_name: 'Novo' } });

    supabase.__queueTable('users', { data: { id: 1, email: 'a@b.com' }, error: null }, { data: null, error: new Error('perfil') });
    await repo.editarUsuario(1, { email: 'n@b.com' });
    expect(supabase.auth.admin.updateUserById).toHaveBeenLastCalledWith('u1', { email: 'a@b.com', email_confirm: true });

    supabase.auth.admin.updateUserById.mockResolvedValueOnce({ error: new Error('auth') });
    supabase.__queueTable('users', { data: { id: 1, email: 'a@b.com' }, error: null });
    await expect(repo.editarUsuario(1, { full_name: 'X' })).resolves.toMatchObject({ error: expect.any(Error) });

    supabase.__queueTable('users', { data: { id: 1, email: 'a@b.com' }, error: null }, { data: { id: 1 }, error: null });
    await repo.editarUsuario(1, { telefone: '1' });
    supabase.auth.admin.listUsers.mockResolvedValueOnce({ data: { users: [{ id: 'u2', email: 'outro@b.com' }] }, error: null });
    supabase.__queueTable('users', { data: { id: 1, email: 'a@b.com' }, error: null }, { data: null, error: new Error('x') });
    await repo.editarUsuario(1, { email: 'n@b.com' });
  });

  test('propaga erro ao listar usuarios do auth', async () => {
    supabase.auth.admin.listUsers.mockResolvedValue({ data: null, error: new Error('auth list') });
    supabase.__queueTable('users', { data: { id: 1, email: 'a@b.com' }, error: null });
    await expect(repo.editarUsuario(1, {})).rejects.toThrow('auth list');
  });
});

describe('remocao de usuarios', () => {
  test('remove, anonimiza quando ha vinculos e trata erros', async () => {
    supabase.__queueTable('users', { data: null, error: null });
    await expect(repo.removerUsuario(1)).resolves.toEqual({ data: null, error: null });

    supabase.__queueTable('users', { data: { id: 1, email: 'a@b.com' }, error: null }, { data: { id: 1 }, error: null });
    await expect(repo.removerUsuario(1)).resolves.toEqual({ data: { id: 1 }, error: null });

    supabase.__queueTable('users', { data: { id: 1, email: 'a@b.com' }, error: null }, { data: null, error: { code: '500' } });
    await expect(repo.removerUsuario(1)).resolves.toMatchObject({ error: { code: '500' } });

    supabase.__queueTable('users', { data: { id: 1, email: 'a@b.com' }, error: null }, { data: null, error: { code: '23503' } }, { data: { id: 1, email: 'deleted' }, error: null });
    await expect(repo.removerUsuario(1)).resolves.toEqual({ data: { id: 1, email: 'a@b.com' }, error: null });

    supabase.__queueTable('users', { data: { id: 1, email: 'a@b.com' }, error: null }, { data: null, error: { code: '23503' } }, { data: null, error: new Error('anon') });
    await expect(repo.removerUsuario(1)).resolves.toMatchObject({ error: expect.any(Error) });
  });

  test('remove usuario do auth por email', async () => {
    supabase.auth.admin.listUsers.mockResolvedValue({ data: { users: [{ id: 'u1', email: 'a@b.com' }] }, error: null });
    supabase.auth.admin.deleteUser.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: new Error('del') });
    await repo.removerAuthPorEmail('A@B.com');
    await expect(repo.removerAuthPorEmail('a@b.com')).rejects.toThrow('del');
    await repo.removerAuthPorEmail('nao@existe.com');
    supabase.auth.admin.listUsers.mockResolvedValue({ data: {}, error: null });
    await repo.removerAuthPorEmail('a@b.com');
    expect(supabase.auth.admin.deleteUser).toHaveBeenCalledTimes(2);
  });
});

test('lista avaliacoes enriquecendo nomes de pecas e fornecedores', async () => {
  supabase.__queueTable('av_prod', { data: null, error: new Error('av') });
  await expect(repo.listarAvaliacoes('av_prod', { from: 0, to: 1 })).resolves.toMatchObject({ error: expect.any(Error) });
  supabase.__queueTable('av_prod', { data: [], error: null });
  await expect(repo.listarAvaliacoes('av_prod', { from: 0, to: 1 })).resolves.toEqual({ data: [], error: null });

  supabase.__queueTable('av_prod', { data: [{ id: 1 }], count: 1, error: null });
  await expect(repo.listarAvaliacoes('av_prod', { from: 0, to: 1 })).resolves.toMatchObject({ data: [{ id: 1, peca_nome: null, fornecedor_nome: null, fornecedor_loja: null }] });

  supabase.__queueTable('av_forn', { data: [
    { id: 1, peca_id: 10, pedido_id: 20, fornecedor_id: 30 },
    { id: 2, pedido_id: 21, fornecedor_id: 31 },
  ], count: 2, error: null });
  supabase.__queueTable('pecas', { data: [{ id: 10, nome_peca: 'Farol' }], error: null });
  supabase.__queueTable('pedidos', { data: [{ id: 21, itens: [{ nome: 'Roda' }, { nome_peca: 'Calota' }, {}] }, { id: 20 }], error: null });
  supabase.__queueTable('users', { data: [{ id: 30, full_name: 'Ana', nome_loja: 'Loja A' }, { id: 31, full_name: 'Bia' }], error: null });
  const resultado = await repo.listarAvaliacoes('av_forn', { from: 0, to: 1 });
  expect(resultado.data).toEqual([
    expect.objectContaining({ peca_nome: 'Farol', fornecedor_nome: 'Ana', fornecedor_loja: 'Loja A' }),
    expect.objectContaining({ peca_nome: 'Roda, Calota', fornecedor_nome: 'Bia', fornecedor_loja: 'Bia' }),
  ]);

  supabase.__queueTable('av_forn', { data: [{ id: 3, peca_id: 10 }], error: null });
  supabase.__queueTable('pecas', { data: null, error: null });
  await expect(repo.listarAvaliacoes('av_forn', { from: 0, to: 1 })).resolves.toMatchObject({ data: [{ peca_nome: null }] });
});
