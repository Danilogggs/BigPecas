-- PREPARADO PARA HOMOLOGACAO. NAO EXECUTADO EM PRODUCAO.
-- Aplicar primeiro no Dev/Qas e validar backend, Auth e chat.
-- Nao copia/apaga dados e nao altera colunas, contas Auth ou senhas.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';

DO $permissions$
DECLARE
  table_name text;
  column_name text;
  sequence_name text;
  function_name text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role' AND rolbypassrls) THEN
    RAISE EXCEPTION 'service_role sem BYPASSRLS: revisar configuracao antes de aplicar.';
  END IF;
  -- Lista explicita do aplicativo: nao modifica auth/storage/extensoes.
  FOREACH table_name IN ARRAY ARRAY[
    'users','marcas','modelos','categorias','materiais','pecas','peca_compatibilidade',
    'vendas','parcelas_venda','avaliacoes_fornecedor','avaliacoes_produto','wishlist',
    'mensagens','pedidos','admin_dashboard_preferences','notificacoes',
    'checklist_validacao_peca','avaliacoes_pecas','taxas_cambio'
  ] LOOP
    IF to_regclass(format('public.%I',table_name)) IS NULL THEN
      RAISE EXCEPTION 'Tabela obrigatoria ausente: %. Aplique o schema antes desta migration.',table_name;
    END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',table_name);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated',table_name);
    -- Grants por coluna sobrevivem ao REVOKE por tabela: revogar explicitamente.
    FOR column_name IN SELECT a.attname FROM pg_attribute a
      WHERE a.attrelid=to_regclass(format('public.%I',table_name)) AND a.attnum>0 AND NOT a.attisdropped
    LOOP
      EXECUTE format('REVOKE ALL (%I) ON TABLE public.%I FROM PUBLIC, anon, authenticated',column_name,table_name);
      sequence_name := pg_get_serial_sequence(format('public.%I',table_name),column_name);
      IF sequence_name IS NOT NULL THEN
        EXECUTE format('REVOKE ALL ON SEQUENCE %s FROM PUBLIC, anon, authenticated',sequence_name);
        EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %s TO service_role',sequence_name);
      END IF;
    END LOOP;
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO service_role',table_name);
  END LOOP;
  -- Views antigas podem expor linhas mesmo quando as tabelas usam RLS.
  FOREACH table_name IN ARRAY ARRAY['fornecedor_stats','vendas_ativas','precos_publicos_moeda'] LOOP
    IF to_regclass(format('public.%I',table_name)) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated',table_name);
      FOR column_name IN SELECT a.attname FROM pg_attribute a
        WHERE a.attrelid=to_regclass(format('public.%I',table_name)) AND a.attnum>0 AND NOT a.attisdropped
      LOOP
        EXECUTE format('REVOKE ALL (%I) ON TABLE public.%I FROM PUBLIC, anon, authenticated',column_name,table_name);
      END LOOP;
      EXECUTE format('GRANT SELECT ON TABLE public.%I TO service_role',table_name);
    END IF;
  END LOOP;
  FOREACH function_name IN ARRAY ARRAY[
    'public.atualizar_preco_total_venda()',
    'public.decidir_avaliacao_peca(bigint,bigint,integer,jsonb,text,boolean)',
    'public.enfileirar_avaliacao_peca()',
    'public.excluir_peca_permanentemente(bigint)',
    'public.excluir_usuario_permanentemente(bigint)',
    'public.preparar_avaliacao_peca()',
    'public.proteger_historico_avaliacao()',
    'public.proteger_is_admin()',
    'public.snapshot_checklist_peca()'
  ] LOOP
    IF to_regprocedure(function_name) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',function_name);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',function_name);
    END IF;
  END LOOP;
END $permissions$;
GRANT USAGE ON SCHEMA public TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.bigpecas_current_profile_id() RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $profile$
  SELECT min(p.id) FROM public.users p
  JOIN auth.users a ON lower(a.email)=lower(p.email)
  WHERE a.id=(SELECT auth.uid()) AND a.email_confirmed_at IS NOT NULL
  HAVING count(*)=1
$profile$;
-- Em caso de emails ambiguos, falhar fechado em vez de escolher outro perfil.
REVOKE ALL ON FUNCTION public.bigpecas_current_profile_id() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bigpecas_current_profile_id() TO authenticated, service_role;
GRANT SELECT ON public.mensagens TO authenticated;
GRANT INSERT(id_remetente,id_destinatario,mensagem) ON public.mensagens TO authenticated;
DO $sequence$
DECLARE s text := pg_get_serial_sequence('public.mensagens','id');
BEGIN
  IF s IS NULL THEN RAISE EXCEPTION 'mensagens.id sem sequence/identity: revisar schema.'; END IF;
  EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %s TO authenticated',s);
END $sequence$;

DROP POLICY IF EXISTS mensagens_participantes_select ON public.mensagens;
CREATE POLICY mensagens_participantes_select ON public.mensagens FOR SELECT TO authenticated
  USING ((SELECT public.bigpecas_current_profile_id()) IN (id_remetente,id_destinatario));
DROP POLICY IF EXISTS mensagens_participantes_restricao ON public.mensagens;
CREATE POLICY mensagens_participantes_restricao ON public.mensagens AS RESTRICTIVE FOR SELECT TO authenticated
  USING ((SELECT public.bigpecas_current_profile_id()) IN (id_remetente,id_destinatario));
DROP POLICY IF EXISTS mensagens_remetente_insert ON public.mensagens;
CREATE POLICY mensagens_remetente_insert ON public.mensagens FOR INSERT TO authenticated
  WITH CHECK (id_remetente=(SELECT public.bigpecas_current_profile_id())
    AND id_destinatario IS NOT NULL AND length(btrim(mensagem)) BETWEEN 1 AND 5000);
DROP POLICY IF EXISTS mensagens_remetente_restricao ON public.mensagens;
CREATE POLICY mensagens_remetente_restricao ON public.mensagens AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (id_remetente=(SELECT public.bigpecas_current_profile_id())
    AND id_destinatario IS NOT NULL AND length(btrim(mensagem)) BETWEEN 1 AND 5000);

-- Defaults somente para objetos futuros criados como postgres.
-- Outros papeis criadores devem ser revisados separadamente.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
