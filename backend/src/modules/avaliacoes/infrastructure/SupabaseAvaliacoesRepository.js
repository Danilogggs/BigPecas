function criarSupabaseAvaliacoesRepository({ supabase, tabelas }) {
  async function buscarUsuario(email) {
    const { data, error } = await supabase.from(tabelas.usuarios)
      .select('id, email, full_name, nome_loja').eq('email', email).maybeSingle();
    if (error) throw error;
    return data;
  }

  async function buscarPedido(id) {
    const { data, error } = await supabase.from(tabelas.pedidos).select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  }

  async function listarDoPedido(pedidoId, compradorId) {
    const [fornecedores, produtos] = await Promise.all([
      supabase.from(tabelas.fornecedores).select('*').eq('pedido_id', pedidoId).eq('comprador_id', compradorId),
      supabase.from(tabelas.produtos).select('*').eq('pedido_id', pedidoId).eq('comprador_id', compradorId),
    ]);
    if (fornecedores.error) throw fornecedores.error;
    if (produtos.error) throw produtos.error;
    return { fornecedores: fornecedores.data || [], produtos: produtos.data || [] };
  }

  async function buscarFornecedorExistente(pedidoId, fornecedorId, compradorId) {
    return supabase.from(tabelas.fornecedores).select('id')
      .eq('pedido_id', pedidoId).eq('fornecedor_id', fornecedorId)
      .eq('comprador_id', compradorId).maybeSingle();
  }

  async function buscarProdutoExistente(pedidoId, vendaId, compradorId) {
    return supabase.from(tabelas.produtos).select('id')
      .eq('pedido_id', pedidoId).eq('venda_id', vendaId)
      .eq('comprador_id', compradorId).maybeSingle();
  }

  const inserirFornecedor = (payload) => supabase.from(tabelas.fornecedores)
    .insert(payload).select('*').single();
  const inserirProduto = (payload) => supabase.from(tabelas.produtos)
    .insert(payload).select('*').single();

  async function listarFornecedor(fornecedorId) {
    const { data, error } = await supabase.from(tabelas.fornecedores)
      .select('id, nota, comentario, qualidade_peca, comunicacao, rapidez_entrega, embalagem, data_avaliacao')
      .eq('fornecedor_id', fornecedorId).eq('verificada', true)
      .order('data_avaliacao', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function listarProduto(pecaId) {
    const { data, error } = await supabase.from(tabelas.produtos)
      .select('id, nota, comentario, data_avaliacao').eq('peca_id', pecaId)
      .eq('verificada', true).order('data_avaliacao', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  return Object.freeze({
    buscarFornecedorExistente, buscarPedido, buscarProdutoExistente, buscarUsuario,
    inserirFornecedor, inserirProduto, listarDoPedido, listarFornecedor, listarProduto,
  });
}

module.exports = criarSupabaseAvaliacoesRepository;
