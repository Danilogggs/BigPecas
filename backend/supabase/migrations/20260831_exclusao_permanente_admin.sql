-- Exclusão permanente administrativa. Executar como owner no Supabase.
-- Remove dependências em uma única transação e fica acessível somente ao service_role.
BEGIN;

CREATE OR REPLACE FUNCTION public.excluir_peca_permanentemente(p_peca_id bigint)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE afetadas bigint;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.pecas WHERE id = p_peca_id) THEN RETURN false; END IF;
  PERFORM set_config('app.exclusao_permanente', 'on', true);

  UPDATE public.notificacoes SET peca_id = NULL WHERE peca_id = p_peca_id;
  DELETE FROM public.avaliacoes_produto WHERE peca_id = p_peca_id
    OR venda_id IN (SELECT id FROM public.vendas WHERE peca_id = p_peca_id);
  DELETE FROM public.avaliacoes_fornecedor WHERE venda_id IN (SELECT id FROM public.vendas WHERE peca_id = p_peca_id);
  DELETE FROM public.parcelas_venda WHERE venda_id IN (SELECT id FROM public.vendas WHERE peca_id = p_peca_id);
  DELETE FROM public.vendas WHERE peca_id = p_peca_id;
  DELETE FROM public.wishlist WHERE peca_id = p_peca_id;
  DELETE FROM public.peca_compatibilidade WHERE peca_id = p_peca_id;
  -- Estruturas do protótipo antigo podem não existir no schema atual.
  IF to_regclass('public.faixas_preco') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.faixas_preco WHERE peca_id = $1' USING p_peca_id;
  END IF;
  IF to_regclass('public.validacao_peca') IS NOT NULL THEN
    IF to_regclass('public.checklist_respostas_validacao') IS NOT NULL THEN
      EXECUTE 'DELETE FROM public.checklist_respostas_validacao WHERE validacao_id IN
        (SELECT id FROM public.validacao_peca WHERE peca_id = $1)' USING p_peca_id;
    END IF;
    EXECUTE 'DELETE FROM public.validacao_peca WHERE peca_id = $1' USING p_peca_id;
  END IF;
  DELETE FROM public.avaliacoes_pecas WHERE peca_id = p_peca_id;
  DELETE FROM public.pecas WHERE id = p_peca_id;
  GET DIAGNOSTICS afetadas = ROW_COUNT;
  RETURN afetadas > 0;
END $$;

CREATE OR REPLACE FUNCTION public.excluir_usuario_permanentemente(p_usuario_id bigint)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE p record; afetadas bigint;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_usuario_id) THEN RETURN false; END IF;
  PERFORM set_config('app.exclusao_permanente', 'on', true);

  FOR p IN SELECT id FROM public.pecas WHERE fornecedor_id = p_usuario_id LOOP
    PERFORM public.excluir_peca_permanentemente(p.id);
  END LOOP;

  DELETE FROM public.avaliacoes_produto WHERE comprador_id = p_usuario_id OR fornecedor_id = p_usuario_id
    OR venda_id IN (SELECT id FROM public.vendas WHERE comprador_id = p_usuario_id OR fornecedor_id = p_usuario_id)
    OR pedido_id IN (SELECT id FROM public.pedidos WHERE user_id = p_usuario_id);
  DELETE FROM public.avaliacoes_fornecedor WHERE comprador_id = p_usuario_id OR fornecedor_id = p_usuario_id
    OR venda_id IN (SELECT id FROM public.vendas WHERE comprador_id = p_usuario_id OR fornecedor_id = p_usuario_id)
    OR pedido_id IN (SELECT id FROM public.pedidos WHERE user_id = p_usuario_id);
  DELETE FROM public.parcelas_venda WHERE venda_id IN
    (SELECT id FROM public.vendas WHERE comprador_id = p_usuario_id OR fornecedor_id = p_usuario_id
      OR pedido_id IN (SELECT id FROM public.pedidos WHERE user_id = p_usuario_id));
  DELETE FROM public.vendas WHERE comprador_id = p_usuario_id OR fornecedor_id = p_usuario_id
    OR pedido_id IN (SELECT id FROM public.pedidos WHERE user_id = p_usuario_id);
  DELETE FROM public.pedidos WHERE user_id = p_usuario_id;
  DELETE FROM public.wishlist WHERE user_id = p_usuario_id;
  DELETE FROM public.admin_dashboard_preferences WHERE user_id = p_usuario_id;
  IF to_regclass('public.validacao_peca') IS NOT NULL THEN
    IF to_regclass('public.checklist_respostas_validacao') IS NOT NULL THEN
      EXECUTE 'DELETE FROM public.checklist_respostas_validacao WHERE validacao_id IN
        (SELECT id FROM public.validacao_peca WHERE avaliador_id = $1)' USING p_usuario_id;
    END IF;
    EXECUTE 'DELETE FROM public.validacao_peca WHERE avaliador_id = $1' USING p_usuario_id;
  END IF;
  UPDATE public.avaliacoes_pecas SET avaliador_id = NULL WHERE avaliador_id = p_usuario_id;
  DELETE FROM public.notificacoes WHERE user_id = p_usuario_id::text;
  DELETE FROM public.mensagens WHERE id_remetente = p_usuario_id OR id_destinatario = p_usuario_id;
  DELETE FROM public.users WHERE id = p_usuario_id;
  GET DIAGNOSTICS afetadas = ROW_COUNT;
  RETURN afetadas > 0;
END $$;

CREATE OR REPLACE FUNCTION public.proteger_historico_avaliacao() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF current_setting('app.exclusao_permanente', true) = 'on' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'O histórico de avaliação não pode ser excluído.'; END IF;
  IF NEW.criterios_snapshot IS DISTINCT FROM OLD.criterios_snapshot OR
     NEW.peca_id IS DISTINCT FROM OLD.peca_id OR NEW.revisao IS DISTINCT FROM OLD.revisao OR
     OLD.status <> 'pendente' THEN
    RAISE EXCEPTION 'O histórico de avaliação é imutável. Crie uma nova revisão.';
  END IF;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.excluir_peca_permanentemente(bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.excluir_usuario_permanentemente(bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.excluir_peca_permanentemente(bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.excluir_usuario_permanentemente(bigint) TO service_role;

COMMIT;
