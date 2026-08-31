function criarSupabaseAdminRepository({ supabase, tabelas }) {
  async function contar(table, configurar = (query) => query) {
    const query = configurar(supabase.from(table).select('*', { count: 'exact', head: true }));
    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
  }

  async function buscarPreferencias(userId) {
    const { data, error } = await supabase.from(tabelas.preferencias)
      .select('config, updated_at').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    return data;
  }

  async function salvarPreferencias(userId, config) {
    const { data, error } = await supabase.from(tabelas.preferencias).upsert({
      user_id: userId, config, updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' }).select('config, updated_at').single();
    if (error) throw error;
    return data;
  }

  async function obterDashboard() {
    const [usuarios, administradores, pecas, pedidos, pedidosPendentes, produtos, fornecedores] = await Promise.all([
      contar(tabelas.usuarios, (q) => q.not('email', 'like', 'deleted+%@removed.bigpecas')),
      contar(tabelas.usuarios, (q) => q.eq('is_admin', true)),
      contar(tabelas.pecas),
      contar(tabelas.pedidos),
      contar(tabelas.pedidos, (q) => q.in('status', ['aguardando_pagamento', 'pago', 'enviado'])),
      contar(tabelas.avaliacoesProduto),
      contar(tabelas.avaliacoesFornecedor),
    ]);
    return {
      usuarios, administradores, pecas, pedidos,
      pedidos_pendentes: pedidosPendentes,
      avaliacoes: produtos + fornecedores,
    };
  }

  async function listarUsuarios({ search, isAdmin, from, to }) {
    let query = supabase.from(tabelas.usuarios).select(
      'id, email, full_name, nome_loja, telefone, tipo_usuario, email_verificado, is_admin, created_at, updated_at',
      { count: 'exact' },
    );
    if (search) query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%,nome_loja.ilike.%${search}%`);
    if (typeof isAdmin === 'boolean') query = query.eq('is_admin', isAdmin);
    query = query.not('email', 'like', 'deleted+%@removed.bigpecas');
    return query.order('created_at', { ascending: false }).range(from, to);
  }

  async function obterDadosGerenciais() {
    const [pedidos, pecas, usuarios] = await Promise.all([
      supabase.from(tabelas.pedidos).select('id, status, total, itens, criado_em').order('criado_em', { ascending: false }),
      supabase.from(tabelas.pecas).select('id, nome_peca, sku, estoque_atual, preco, fornecedor_id'),
      supabase.from(tabelas.usuarios).select('id, email, full_name, nome_loja, is_admin, created_at').not('email', 'like', 'deleted+%@removed.bigpecas').order('created_at', { ascending: false }),
    ]);
    if (pedidos.error) throw pedidos.error;
    if (pecas.error) throw pecas.error;
    if (usuarios.error) throw usuarios.error;
    return { pedidos: pedidos.data || [], pecas: pecas.data || [], usuarios: usuarios.data || [] };
  }

  async function buscarUsuarioPorEmail(email) {
    return supabase.from(tabelas.usuarios)
      .select('id, email').eq('email', email).maybeSingle();
  }

  async function criarContaAdmin({ email, password, fullName }) {
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, tipo_usuario: 'ambos' },
    });
    if (authError) return { data: null, error: authError };

    const authUserId = authData?.user?.id;
    const { data, error } = await supabase.from(tabelas.usuarios).insert({
      email,
      full_name: fullName,
      tipo_usuario: 'ambos',
      email_verificado: true,
      is_admin: true,
      created_at: new Date().toISOString(),
    }).select('id, email, full_name, is_admin, created_at').single();

    if (error && authUserId) await supabase.auth.admin.deleteUser(authUserId);
    return { data, error };
  }

  async function contarAdmins() { return contar(tabelas.usuarios, (q) => q.eq('is_admin', true)); }

  async function atualizarPermissao(userId, isAdmin) {
    return supabase.from(tabelas.usuarios)
      .update({ is_admin: isAdmin, updated_at: new Date().toISOString() })
      .eq('id', userId).select('id, email, full_name, is_admin').maybeSingle();
  }

  async function localizarAuthPorEmail(email) {
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) throw error;
    return data?.users?.find((user) => user.email?.toLowerCase() === email.toLowerCase()) || null;
  }

  async function editarUsuario(id, dados) {
    const atual = await supabase.from(tabelas.usuarios).select('*').eq('id', id).maybeSingle();
    if (atual.error || !atual.data) return atual;
    const authUser = await localizarAuthPorEmail(atual.data.email);
    if (authUser && (dados.email || dados.full_name)) {
      const authUpdate = { ...(dados.email ? { email: dados.email, email_confirm: true } : {}),
        user_metadata: { ...(authUser.user_metadata || {}), ...(dados.full_name ? { full_name: dados.full_name } : {}) } };
      const atualizado = await supabase.auth.admin.updateUserById(authUser.id, authUpdate);
      if (atualizado.error) return { data: null, error: atualizado.error };
    }
    const resultado = await supabase.from(tabelas.usuarios).update({ ...dados, updated_at: new Date().toISOString() }).eq('id', id).select('*').maybeSingle();
    if (resultado.error && authUser && dados.email) await supabase.auth.admin.updateUserById(authUser.id, { email: atual.data.email, email_confirm: true });
    return resultado;
  }

  async function removerUsuario(id) {
    const atual = await supabase.from(tabelas.usuarios).select('id, email').eq('id', id).maybeSingle();
    if (atual.error || !atual.data) return atual;
    const removido = await supabase.from(tabelas.usuarios).delete().eq('id', id).select('id, email').maybeSingle();
    if (!removido.error) return removido;
    if (removido.error.code !== '23503') return removido;
    const emailOriginal = atual.data.email;
    const anonimizado = await supabase.from(tabelas.usuarios).update({
      email: `deleted+${id}@removed.bigpecas`, full_name: 'Usuario excluido', nome_loja: null,
      telefone: null, is_admin: false, updated_at: new Date().toISOString(),
    }).eq('id', id).select('id, email').maybeSingle();
    return anonimizado.error ? anonimizado : { data: { ...anonimizado.data, email: emailOriginal }, error: null };
  }
  async function removerAuthPorEmail(email) {
    const authUser = await localizarAuthPorEmail(email);
    if (authUser) { const resultado = await supabase.auth.admin.deleteUser(authUser.id); if (resultado.error) throw resultado.error; }
  }

  async function listarPecas({ search, from, to }) {
    let query = supabase.from(tabelas.pecas).select('*', { count: 'exact' }).neq('status_publicacao', 'arquivada');
    if (search) query = query.or(`nome_peca.ilike.%${search}%,sku.ilike.%${search}%,oem_number.ilike.%${search}%`);
    return query.order('id', { ascending: false }).range(from, to);
  }

  const removerPeca = (id) => supabase.from(tabelas.pecas).update({ status_publicacao: 'arquivada' }).eq('id', id)
    .select('id, nome_peca').maybeSingle();
  const editarPeca = (id, dados) => supabase.from(tabelas.pecas).update(dados).eq('id', id).select('*').maybeSingle();

  async function listarPedidos({ status, from, to }) {
    let query = supabase.from(tabelas.pedidos).select('*', { count: 'exact' });
    if (status) query = query.eq('status', status);
    return query.order('criado_em', { ascending: false }).range(from, to);
  }

  const buscarPedido = (id) => supabase.from(tabelas.pedidos)
    .select('id, historico').eq('id', id).maybeSingle();
  const atualizarPedido = (id, dados) => supabase.from(tabelas.pedidos)
    .update(dados).eq('id', id).select('*').single();
  async function listarAvaliacoes(table, { from, to }) {
    const resultado = await supabase.from(table).select('*', { count: 'exact' })
      .order('data_avaliacao', { ascending: false }).range(from, to);
    if (resultado.error || !resultado.data?.length) return resultado;
    const pecasIds = [...new Set(resultado.data.map((item) => item.peca_id).filter(Boolean))];
    const pedidosIds = [...new Set(resultado.data.map((item) => item.pedido_id).filter(Boolean))];
    const fornecedoresIds = [...new Set(resultado.data.map((item) => item.fornecedor_id).filter(Boolean))];
    const [pecas, pedidos, fornecedores] = await Promise.all([
      pecasIds.length ? supabase.from(tabelas.pecas).select('id, nome_peca').in('id', pecasIds) : { data: [] },
      pedidosIds.length ? supabase.from(tabelas.pedidos).select('id, itens').in('id', pedidosIds) : { data: [] },
      fornecedoresIds.length ? supabase.from(tabelas.usuarios).select('id, full_name, nome_loja').in('id', fornecedoresIds) : { data: [] },
    ]);
    const nomes = new Map((pecas.data || []).map((item) => [String(item.id), item.nome_peca]));
    const pedidosMap = new Map((pedidos.data || []).map((item) => [String(item.id), item]));
    const fornecedoresMap = new Map((fornecedores.data || []).map((item) => [String(item.id), item]));
    return { ...resultado, data: resultado.data.map((item) => {
      const pedido = pedidosMap.get(String(item.pedido_id));
      const nomesPedido = (pedido?.itens || []).map((peca) => peca.nome || peca.nome_peca).filter(Boolean);
      const fornecedor = fornecedoresMap.get(String(item.fornecedor_id));
      return { ...item, peca_nome: nomes.get(String(item.peca_id)) || nomesPedido.join(', ') || null,
        fornecedor_nome: fornecedor?.full_name || null,
        fornecedor_loja: fornecedor?.nome_loja || fornecedor?.full_name || null };
    }) };
  }
  const removerAvaliacao = (table, id) => supabase.from(table).delete().eq('id', id)
    .select('id').maybeSingle();
  const editarAvaliacao = (table, id, dados) => supabase.from(table).update(dados).eq('id', id).select('*').maybeSingle();

  return Object.freeze({
    atualizarPedido, atualizarPermissao, buscarPedido, buscarPreferencias, buscarUsuarioPorEmail,
    contarAdmins, criarContaAdmin,
    editarAvaliacao, editarPeca, editarUsuario, listarAvaliacoes, listarPecas, listarPedidos,
    listarUsuarios, obterDashboard, obterDadosGerenciais, removerAvaliacao, removerAuthPorEmail, removerPeca,
    removerUsuario, salvarPreferencias,
  });
}

module.exports = criarSupabaseAdminRepository;
