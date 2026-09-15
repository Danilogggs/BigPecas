// Verifica somente PostgreSQL local em memoria. Nao conecta a nenhum Supabase.
// Instalar @electric-sql/pglite em diretorio temporario e informar PGLITE_MODULE.
const { PGlite } = require(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
  const db = new PGlite();
  let checks = 0;
  const check = (value, expected) => { assert.deepEqual(value, expected); checks++; };
  const one = async sql => (await db.query(sql)).rows[0];
  const denied = async sql => { await assert.rejects(db.exec(sql)); checks++; };
  try {
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth;
      CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, email_confirmed_at timestamptz);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
        SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
      $$;
      GRANT USAGE ON SCHEMA auth TO authenticated,service_role;
      GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated,service_role;
      CREATE PUBLICATION supabase_realtime;
      CREATE FUNCTION auth.enable_rls() RETURNS event_trigger LANGUAGE plpgsql AS $$
      DECLARE command record;
      BEGIN
        FOR command IN SELECT * FROM pg_event_trigger_ddl_commands() LOOP
          IF command.schema_name='public' AND command.object_type='table' THEN
            EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY',command.object_identity);
          END IF;
        END LOOP;
      END $$;
      CREATE EVENT TRIGGER auto_rls ON ddl_command_end WHEN TAG IN ('CREATE TABLE') EXECUTE FUNCTION auth.enable_rls();
    `);
    const sql = fs.readFileSync(path.resolve(__dirname, '../../backend/supabase/setup-devqas.sql'), 'utf8');
    await db.exec(sql);
    // Comparar somente metadados efetivamente exportados, sem inferir tamanhos/precisao.
    const snapshot = JSON.parse(fs.readFileSync(path.resolve(__dirname,
      '../../backend/supabase/production-schema.snapshot.json'), 'utf8'));
    const columns = (await db.query(`SELECT table_name,column_name,data_type,udt_name,
      is_nullable,column_default,is_identity,identity_generation FROM information_schema.columns
      WHERE table_schema='public' AND table_name IN (SELECT tablename FROM pg_tables WHERE schemaname='public')
      ORDER BY table_name,ordinal_position`)).rows;
    check(columns, snapshot.columns.map(({ordinal_position,...column}) => column));
    const normalize = s => s.replace(/\s+/g,' ').trim();
    const constraints = (await db.query(`SELECT t.relname AS tabela,c.conname AS nome,
      pg_get_constraintdef(c.oid) AS definicao FROM pg_constraint c
      JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace
      WHERE n.nspname='public' AND c.contype<>'n' ORDER BY t.relname,c.conname`)).rows;
    const sorted = rows => [...rows].sort((a,b) => (a.tabela+'.'+a.nome).localeCompare(b.tabela+'.'+b.nome));
    // PG18 (PGlite) simplifica estes parenteses de AND e cataloga NOT NULL separado.
    const constraintText = s => normalize(s).replace(
      '((((qualidade_peca >= 1) AND (qualidade_peca <= 5)) AND',
      '(((qualidade_peca >= 1) AND (qualidade_peca <= 5) AND')
      .replace(/\(\(ARRAY\[([^\]]+)\]\)::text\[\]\)/g, (_,items) =>
        `(ARRAY[${items.split(', ').map(item=>`(${item})::text`).join(', ')}])`);
    check(sorted(constraints).map(c=>({...c,definicao:constraintText(c.definicao)})),
      sorted(snapshot.constraints).map(c=>({...c,definicao:constraintText(c.definicao)})));
    const views = (await db.query("SELECT viewname,definition FROM pg_views WHERE schemaname='public' ORDER BY viewname")).rows;
    check(views.map(v=>({viewname:v.viewname,definition:constraintText(v.definition)})),
      [...snapshot.views].sort((a,b)=>a.viewname.localeCompare(b.viewname))
        .map(v=>({viewname:v.viewname,definition:constraintText(v.definition)})));
    const triggers = (await db.query(`SELECT tgname AS name,pg_get_triggerdef(oid) AS definition
      FROM pg_trigger WHERE NOT tgisinternal AND tgrelid IN
      (SELECT oid FROM pg_class WHERE relnamespace='public'::regnamespace) ORDER BY tgname`)).rows;
    check(triggers, [...snapshot.triggers].sort((a,b)=>a.name.localeCompare(b.name))
      .map(t=>({name:t.name,definition:t.definition})));
    const indexes = (await db.query("SELECT indexname,indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY indexname")).rows;
    check(indexes, [...snapshot.indexes].sort((a,b)=>a.indexname.localeCompare(b.indexname))
      .map(i=>({indexname:i.indexname,indexdef:i.indexdef})));
    const migration = fs.readFileSync(path.resolve(__dirname,
      '../../backend/supabase/migrations/20260914_restringir_acesso_dados.sql'),'utf8');
    check(sql.split('-- BEGIN SECURITY MIGRATION\n')[1].split('\n-- END SECURITY MIGRATION')[0].trim(),
      migration.replace(/\r/g,'').replace(/^(BEGIN|COMMIT);\s*$/gm,'').trim());
    check((await one("SELECT count(*)::int AS n FROM pg_tables WHERE schemaname='public' AND NOT rowsecurity")).n, 0);
    check((await one("SELECT count(*)::int AS n FROM pg_tables WHERE schemaname='public'")).n, 19);
    check((await one('SELECT count(*)::int AS n FROM public.categorias')).n, 6);
    check((await one('SELECT count(*)::int AS n FROM public.materiais')).n, 6);
    check((await one("SELECT has_function_privilege('authenticated','public.decidir_avaliacao_peca(bigint,bigint,integer,jsonb,text,boolean)','EXECUTE') AS allowed")).allowed, false);
    check((await one("SELECT has_function_privilege('anon','public.excluir_usuario_permanentemente(bigint)','EXECUTE') AS allowed")).allowed, false);
    await db.exec(`
      INSERT INTO auth.users VALUES
      ('00000000-0000-0000-0000-000000000001','alice@example.invalid',now()),
      ('00000000-0000-0000-0000-000000000002','bob@example.invalid',now()),
      ('00000000-0000-0000-0000-000000000003','carol@example.invalid',now());
      SET ROLE service_role;
      INSERT INTO public.users(email,full_name,tipo_usuario) VALUES
      ('alice@example.invalid','Alice','ambos'),('bob@example.invalid','Bob','ambos'),('carol@example.invalid','Carol','avaliador');
      SET ROLE authenticated;
      SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
      INSERT INTO public.mensagens(id_remetente,id_destinatario,mensagem) VALUES(1,2,'Mensagem de teste');
    `);
    check((await one('SELECT count(*)::int AS n FROM public.mensagens')).n, 1);
    await denied('SELECT * FROM public.users');
    await denied("INSERT INTO public.mensagens(id_remetente,id_destinatario,mensagem) VALUES(2,3,'Impersonacao')");
    await denied("UPDATE public.mensagens SET mensagem='Adulterada'");
    await denied("SELECT public.excluir_usuario_permanentemente(2)");
    await db.exec("SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false)");
    check((await one('SELECT count(*)::int AS n FROM public.mensagens')).n, 1);
    await db.exec("SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false)");
    check((await one('SELECT count(*)::int AS n FROM public.mensagens')).n, 0);
    await db.exec('SET ROLE anon');
    await denied('SELECT * FROM public.mensagens');
    await db.exec(`
      SET ROLE service_role;
      INSERT INTO public.pecas(nome_peca,fornecedor_id,preco_base,moeda_base) VALUES('Peca ficticia',1,100,'BRL');
    `);
    check((await one('SELECT status_publicacao FROM public.pecas WHERE id=1')).status_publicacao, 'pendente_validacao');
    check((await one('SELECT count(*)::int AS n FROM public.precos_publicos_moeda')).n, 0);
    const criterios = (await one('SELECT criterios_snapshot FROM public.avaliacoes_pecas WHERE peca_id=1')).criterios_snapshot;
    const respostas = JSON.stringify(criterios.map(c => ({ criterio_id: c.id, resposta: true })));
    await db.query('SELECT public.decidir_avaliacao_peca(1,3,1,$1::jsonb)', [respostas]);
    check((await one('SELECT status_publicacao FROM public.pecas WHERE id=1')).status_publicacao, 'publicada');
    check((await one('SELECT count(*)::int AS n FROM public.precos_publicos_moeda')).n, 1);
    await db.exec('UPDATE public.pecas SET estoque_atual=2 WHERE id=1');
    check((await one('SELECT revisao_avaliacao FROM public.pecas WHERE id=1')).revisao_avaliacao, 1);
    await db.exec('UPDATE public.pecas SET preco_base=120 WHERE id=1');
    check((await one('SELECT revisao_avaliacao FROM public.pecas WHERE id=1')).revisao_avaliacao, 2);
    await db.exec('SELECT public.excluir_peca_permanentemente(1)');
    check((await one('SELECT count(*)::int AS n FROM public.pecas')).n, 0);
    await db.exec('RESET ROLE');
    await denied(sql); // Recusa reexecucao em banco ja inicializado.
    await db.exec('ROLLBACK');
    check((await one('SELECT count(*)::int AS n FROM public.users')).n, 3);
    console.log(`${checks} verificacoes SQL/RLS aprovadas em PostgreSQL local (PGlite). Nenhuma conexao remota.`);
  } finally { await db.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
