-- SOMENTE LEITURA: exporta definicoes, nao registros de usuarios/compras.
-- Executar no SQL Editor de producao e exportar a unica linha como CSV.
-- Revisar antes de compartilhar: funcoes antigas podem conter valores fixos sensiveis.
SELECT jsonb_build_object(
  'functions', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'schema', n.nspname,
      'name', p.proname,
      'identity_arguments', pg_get_function_identity_arguments(p.oid),
      'definition', pg_get_functiondef(p.oid)
    ) ORDER BY p.proname, p.oid), '[]'::jsonb)
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind IN ('f', 'p')
      AND NOT EXISTS (
        SELECT 1 FROM pg_depend d
        WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid
          AND d.deptype = 'e'
      )
  ),
  'triggers', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'schema', n.nspname, 'table', c.relname, 'name', t.tgname,
      'enabled', t.tgenabled, 'definition', pg_get_triggerdef(t.oid)
    ) ORDER BY n.nspname, c.relname, t.tgname), '[]'::jsonb)
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname IN ('public', 'auth') AND NOT t.tgisinternal
  ),
  'relation_security', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'name', c.relname, 'kind', c.relkind,
      'rls_enabled', c.relrowsecurity, 'rls_forced', c.relforcerowsecurity,
      'options', c.reloptions, 'acl', c.relacl::text
    ) ORDER BY c.relname), '[]'::jsonb)
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm', 'S')
  ),
  'table_grants', (
    SELECT coalesce(jsonb_agg(to_jsonb(g)), '[]'::jsonb)
    FROM information_schema.table_privileges g WHERE table_schema = 'public'
  ),
  'column_grants', (
    SELECT coalesce(jsonb_agg(to_jsonb(g)), '[]'::jsonb)
    FROM information_schema.column_privileges g WHERE table_schema = 'public'
  ),
  'function_grants', (
    SELECT coalesce(jsonb_agg(to_jsonb(g)), '[]'::jsonb)
    FROM information_schema.routine_privileges g WHERE routine_schema = 'public'
  ),
  'indexes', (
    SELECT coalesce(jsonb_agg(to_jsonb(i)), '[]'::jsonb)
    FROM pg_indexes i WHERE schemaname = 'public'
  )
) AS estrutura;
