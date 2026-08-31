function criarSupabasePecasRepository({ supabase, tabelas }) {
  const { pecas, usuarios, categorias, materiais } = tabelas;

  return Object.freeze({
    async buscarFornecedorPorEmail(email) {
      const { data, error } = await supabase
        .from(usuarios)
        .select('id, email, tipo_usuario, nome_loja, descricao_loja, email_verificado')
        .eq('email', email)
        .maybeSingle();
      if (error) throw error;
      return data;
    },

    async criarPeca(payload) {
      const { data, error } = await supabase.from(pecas).insert(payload).select('*').single();
      if (error) throw error;
      return data;
    },

    async listarPecas({ filtros, ordenacao, paginacao }) {
      let query = filtros.fornecedorAtualId
        ? supabase.from(pecas).select('*').neq('status_publicacao', 'arquivada')
        : supabase.from('precos_publicos_moeda').select('*').eq('moeda_exibicao', filtros.moeda || 'BRL');
      const campoPreco = filtros.fornecedorAtualId ? 'preco' : 'preco_exibicao';
      if (filtros.fornecedorAtualId) query = query.eq('fornecedor_id', filtros.fornecedorAtualId);
      if (filtros.fornecedorId !== null) query = query.eq('fornecedor_id', filtros.fornecedorId);
      if (filtros.categoriaId !== null) query = query.eq('categoria_id', filtros.categoriaId);
      if (filtros.materialId !== null) query = query.eq('material_id', filtros.materialId);
      if (filtros.condicao) query = query.eq('condicao', filtros.condicao);
      if (filtros.oemNumber) query = query.eq('oem_number', filtros.oemNumber);
      if (filtros.numeroSerie) query = query.eq('num_serie', filtros.numeroSerie);
      if (filtros.nome) query = query.ilike('nome_peca', `%${filtros.nome}%`);
      if (filtros.precoMinimo !== null) query = query.gte(campoPreco, filtros.precoMinimo);
      if (filtros.precoMaximo !== null) query = query.lte(campoPreco, filtros.precoMaximo);
      if (filtros.estoqueMinimo !== null) query = query.gte('estoque_atual', filtros.estoqueMinimo);

      query = query.order(ordenacao.campo === 'preco' ? campoPreco : ordenacao.campo, { ascending: ordenacao.ascendente });
      const { data, error, count } = await query
        .select('*', { count: 'estimated' })
        .range(paginacao.inicio, paginacao.fim);
      if (error) throw error;
      return { itens: data || [], total: count ?? 0 };
    },

    async listarFornecedores() {
      const { data, error } = await supabase
        .from(usuarios)
        .select('id, full_name, email, tipo_usuario, nome_loja, descricao_loja, telefone, email_verificado');
      if (error) throw error;
      return data || [];
    },

    async listarPecasDosFornecedores(ids) {
      const { data, error } = await supabase
        .from(pecas)
        .select('id, nome_peca, fornecedor_id, preco, estoque_atual, imagem')
        .in('fornecedor_id', ids).eq('status_publicacao', 'publicada');
      if (error) throw error;
      return data || [];
    },

    async buscarFornecedorPorId(id) {
      const { data, error } = await supabase
        .from(usuarios)
        .select('id, full_name, email, tipo_usuario, nome_loja, descricao_loja, telefone, email_verificado, created_at')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },

    async listarPecasPorFornecedor(id) {
      const { data, error } = await supabase
        .from(pecas)
        .select('*')
        .eq('fornecedor_id', id).eq('status_publicacao', 'publicada')
        .order('id', { ascending: false });
      if (error) throw error;
      return data || [];
    },

    async buscarPecaPorId(id) {
      const { data, error } = await supabase
        .from(pecas)
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },

    async buscarCandidatasRecomendacao(pecaBase, id) {
      const filtrosOr = [];
      if (pecaBase.categoria_id) filtrosOr.push(`categoria_id.eq.${pecaBase.categoria_id}`);
      if (pecaBase.material_id) filtrosOr.push(`material_id.eq.${pecaBase.material_id}`);
      if (pecaBase.condicao) filtrosOr.push(`condicao.eq.${pecaBase.condicao}`);

      let query = supabase
        .from(pecas)
        .select('*')
        .eq('status_publicacao', 'publicada')
        .neq('id', id)
        .gt('estoque_atual', 0)
        .limit(30);
      if (filtrosOr.length > 0) query = query.or(filtrosOr.join(','));

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    async atualizarPeca(id, updates) {
      const { data, error } = await supabase
        .from(pecas)
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },

    async deletarPeca(id) {
      const { error } = await supabase.from(pecas).update({ status_publicacao: 'arquivada' }).eq('id', id);
      if (error) throw error;
    },

    async listarCategorias() {
      const { data, error } = await supabase
        .from(categorias)
        .select('*')
        .order('nome', { ascending: true });
      if (error) throw error;
      return data || [];
    },

    async listarMateriais() {
      const { data, error } = await supabase
        .from(materiais)
        .select('*')
        .order('nome', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });
}

module.exports = criarSupabasePecasRepository;
