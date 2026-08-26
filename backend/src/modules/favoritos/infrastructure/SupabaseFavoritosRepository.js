function criarSupabaseFavoritosRepository({ supabase, tabelas }) {
  async function buscarUsuarioPorEmail(email) {
    const { data, error } = await supabase.from(tabelas.usuarios)
      .select('id, email, full_name').eq('email', email).maybeSingle();
    if (error) throw error;
    return data;
  }

  async function listarItens(userId) {
    const { data, error } = await supabase.from(tabelas.favoritos)
      .select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function listarPecas(ids) {
    const { data, error } = await supabase.from(tabelas.pecas).select('*').in('id', ids);
    if (error) throw error;
    return data || [];
  }

  async function buscarPeca(id) {
    const { data, error } = await supabase.from(tabelas.pecas).select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  }

  async function buscarItem(userId, pecaId) {
    const { data, error } = await supabase.from(tabelas.favoritos)
      .select('*').eq('user_id', userId).eq('peca_id', pecaId).maybeSingle();
    if (error) throw error;
    return data;
  }

  async function adicionar(userId, pecaId) {
    const { data, error } = await supabase.from(tabelas.favoritos)
      .insert({ user_id: userId, peca_id: pecaId }).select('*').single();
    if (error) throw error;
    return data;
  }

  async function remover(userId, pecaId) {
    const { error } = await supabase.from(tabelas.favoritos)
      .delete().eq('user_id', userId).eq('peca_id', pecaId);
    if (error) throw error;
  }

  return Object.freeze({ adicionar, buscarItem, buscarPeca, buscarUsuarioPorEmail, listarItens, listarPecas, remover });
}

module.exports = criarSupabaseFavoritosRepository;
