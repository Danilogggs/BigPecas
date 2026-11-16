function criarSupabaseCarrinhoRepository({ supabase, tabelas }) {
  async function buscarUsuarioPorEmail(email) {
    const { data, error } = await supabase.from(tabelas.usuarios)
      .select('id, email').eq('email', email).maybeSingle();
    if (error) throw error;
    return data;
  }

  async function buscarCarrinho(userId) {
    const { data, error } = await supabase.from(tabelas.carrinhos)
      .select('itens, updated_at').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    return data;
  }

  async function salvarCarrinho(userId, itens) {
    const { data, error } = await supabase.from(tabelas.carrinhos)
      .upsert({ user_id: userId, itens, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      .select('updated_at').single();
    if (error) throw error;
    return data;
  }

  async function listarPecas(ids) {
    const { data, error } = await supabase.from(tabelas.pecas)
      .select('id, nome_peca, preco, imagem, estoque_atual, sku, peso_gramas, comprimento_mm, largura_mm, altura_mm')
      .eq('status_publicacao', 'publicada').in('id', ids);
    if (error) throw error;
    return data || [];
  }

  return Object.freeze({ buscarCarrinho, buscarUsuarioPorEmail, listarPecas, salvarCarrinho });
}

module.exports = criarSupabaseCarrinhoRepository;
