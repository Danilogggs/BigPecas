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
      contar(tabelas.usuarios),
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
    return query.order('created_at', { ascending: false }).range(from, to);
  }

  async function contarAdmins() { return contar(tabelas.usuarios, (q) => q.eq('is_admin', true)); }

  async function atualizarPermissao(userId, isAdmin) {
    return supabase.from(tabelas.usuarios)
      .update({ is_admin: isAdmin, updated_at: new Date().toISOString() })
      .eq('id', userId).select('id, email, full_name, is_admin').maybeSingle();
  }

  async function listarPecas({ search, from, to }) {
    let query = supabase.from(tabelas.pecas).select('*', { count: 'exact' });
    if (search) query = query.or(`nome_peca.ilike.%${search}%,sku.ilike.%${search}%,oem_number.ilike.%${search}%`);
    return query.order('id', { ascending: false }).range(from, to);
  }

  const removerPeca = (id) => supabase.from(tabelas.pecas).delete().eq('id', id)
    .select('id, nome_peca').maybeSingle();

  async function listarPedidos({ status, from, to }) {
    let query = supabase.from(tabelas.pedidos).select('*', { count: 'exact' });
    if (status) query = query.eq('status', status);
    return query.order('criado_em', { ascending: false }).range(from, to);
  }

  const buscarPedido = (id) => supabase.from(tabelas.pedidos)
    .select('id, historico').eq('id', id).maybeSingle();
  const atualizarPedido = (id, dados) => supabase.from(tabelas.pedidos)
    .update(dados).eq('id', id).select('*').single();
  const listarAvaliacoes = (table, { from, to }) => supabase.from(table)
    .select('*', { count: 'exact' }).order('data_avaliacao', { ascending: false }).range(from, to);
  const removerAvaliacao = (table, id) => supabase.from(table).delete().eq('id', id)
    .select('id').maybeSingle();

  return Object.freeze({
    atualizarPedido, atualizarPermissao, buscarPedido, buscarPreferencias, contarAdmins,
    listarAvaliacoes, listarPecas, listarPedidos, listarUsuarios, obterDashboard,
    removerAvaliacao, removerPeca, salvarPreferencias,
  });
}

module.exports = criarSupabaseAdminRepository;
