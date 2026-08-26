function criarSupabaseNotificacoesRepository({ supabase, tabelas }) {
  async function buscarUsuario(email) {
    const { data, error } = await supabase.from(tabelas.usuarios)
      .select('id, email').eq('email', email).maybeSingle();
    if (error) throw error;
    return data;
  }

  async function contarNaoLidas(userId) {
    const { count, error } = await supabase.from(tabelas.notificacoes)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', String(userId)).is('lida_em', null);
    if (error) throw error;
    return Number(count || 0);
  }

  async function listar(userId) {
    const { data, error } = await supabase.from(tabelas.notificacoes)
      .select('id, user_id, pedido_id, tipo, titulo, mensagem, status_envio, lida_em, criada_em')
      .eq('user_id', String(userId)).order('criada_em', { ascending: false }).limit(50);
    if (error) throw error;
    return data || [];
  }

  async function marcarComoLida(id, userId) {
    const { data, error } = await supabase.from(tabelas.notificacoes)
      .update({ lida_em: new Date().toISOString() }).eq('id', id)
      .eq('user_id', String(userId)).select('id, lida_em').maybeSingle();
    if (error) throw error;
    return data;
  }

  return Object.freeze({ buscarUsuario, contarNaoLidas, listar, marcarComoLida });
}

module.exports = criarSupabaseNotificacoesRepository;
