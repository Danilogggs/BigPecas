function criarSupabasePedidosRepository({ supabase, tabelas }) {
  const { pedidos, pecas, usuarios } = tabelas;

  return Object.freeze({
    async buscarUsuarioPorEmail(email) {
      const { data, error } = await supabase
        .from(usuarios)
        .select('id, email, full_name, nome_loja, tipo_usuario')
        .eq('email', email)
        .maybeSingle();

      if (error) throw error;
      return data;
    },

    async buscarPecasPorIds(ids, somentePublicadas = false) {
      const idsUnicos = [...new Set(
        ids.filter((id) => id !== null && id !== undefined).map(String),
      )];
      if (idsUnicos.length === 0) return [];

      let query = supabase.from(pecas)
        .select('id, nome_peca, preco, preco_base, moeda_base, imagem, sku, estoque_atual, fornecedor_id')
        .in('id', idsUnicos);
      if (somentePublicadas) query = query.eq('status_publicacao', 'publicada');
      const { data, error } = await query;

      if (error) throw error;
      if (somentePublicadas && data?.length) {
        const { data: taxas, error: taxaError } = await supabase.from('taxas_cambio').select('moeda, unidades_por_brl');
        if (taxaError) throw taxaError;
        return data.map(p => {
          const taxa = Number(taxas.find(t => t.moeda === p.moeda_base)?.unidades_por_brl);
          if (!(taxa > 0)) throw new Error('Câmbio indisponível para esta peça.');
          return { ...p, preco: Math.round(Number(p.preco_base) / taxa * 100) / 100 };
        });
      }
      return data || [];
    },

    async buscarUsuariosPorIds(ids) {
      const idsUnicos = [...new Set(ids.filter(Boolean).map(String))];
      if (idsUnicos.length === 0) return [];

      const { data, error } = await supabase
        .from(usuarios)
        .select('id, email, full_name, nome_loja, receber_email_notificacao_venda')
        .in('id', idsUnicos);

      if (error) throw error;
      return data || [];
    },

    async listarPedidos() {
      const { data, error } = await supabase
        .from(pedidos)
        .select('*')
        .order('criado_em', { ascending: false });

      if (error) throw error;
      return data || [];
    },

    async buscarPedidoPorId(id) {
      const { data, error } = await supabase
        .from(pedidos)
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },

    async criarPedido(novoPedido) {
      const { data, error } = await supabase
        .from(pedidos)
        .insert(novoPedido)
        .select('*')
        .single();

      if (error) throw error;
      return data;
    },

    async atualizarStatus(id, status, historico) {
      const { data, error } = await supabase
        .from(pedidos)
        .update({ status, historico })
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;
      return data;
    },
  });
}

module.exports = criarSupabasePedidosRepository;
