// Teste somente local. Reproduz grants inseguros sem conectar a producao.
const { PGlite } = require('@electric-sql/pglite');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
  const db = new PGlite();
  let checks = 0;
  const check = (a,b) => { assert.deepEqual(a,b); checks++; };
  const one = async sql => (await db.query(sql)).rows[0];
  const denied = async sql => { await assert.rejects(db.exec(sql)); checks++; };
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
        SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      GRANT USAGE ON SCHEMA auth TO authenticated,service_role;
      GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated,service_role;`);
    await db.exec(fs.readFileSync(path.resolve(__dirname,'../../backend/supabase/setup-devqas.sql'),'utf8'));
    await db.exec(`
      INSERT INTO auth.users VALUES
      ('00000000-0000-0000-0000-000000000001','alice@example.invalid',now()),
      ('00000000-0000-0000-0000-000000000002','bob@example.invalid',now()),
      ('00000000-0000-0000-0000-000000000003','carol@example.invalid',now()),
      ('00000000-0000-0000-0000-000000000004','pending@example.invalid',NULL);
      INSERT INTO public.users(email,full_name) VALUES
      ('alice@example.invalid','Alice'),('bob@example.invalid','Bob'),
      ('carol@example.invalid','Carol'),('pending@example.invalid','Pending');
      INSERT INTO public.mensagens(id_remetente,id_destinatario,mensagem) VALUES (1,2,'Original');
      GRANT ALL ON ALL TABLES IN SCHEMA public TO anon,authenticated;
      GRANT SELECT(email),UPDATE(is_admin) ON public.users TO authenticated;
      GRANT SELECT(nome_comprador) ON public.vendas_ativas TO anon;
      ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
      ALTER TABLE public.mensagens DISABLE ROW LEVEL SECURITY;
      ALTER TABLE public.pedidos DISABLE ROW LEVEL SECURITY;
      ALTER TABLE public.vendas DISABLE ROW LEVEL SECURITY;
      CREATE POLICY old_messages_allow_all ON public.mensagens FOR ALL TO authenticated USING(true) WITH CHECK(true);
    `);
    const migration = fs.readFileSync(path.resolve(__dirname,'../../backend/supabase/migrations/20260914_restringir_acesso_dados.sql'),'utf8');
    await db.exec(migration);
    await db.exec(migration); // Reexecutavel e nao apaga dados.
    check((await one('SELECT count(*)::int AS n FROM public.users')).n,4);
    check((await one('SELECT mensagem FROM public.mensagens WHERE id=1')).mensagem,'Original');
    check((await one("SELECT has_column_privilege('authenticated','public.users','email','SELECT') AS allowed")).allowed,false);
    check((await one("SELECT has_column_privilege('authenticated','public.users','is_admin','UPDATE') AS allowed")).allowed,false);
    check((await one("SELECT has_column_privilege('anon','public.vendas_ativas','nome_comprador','SELECT') AS allowed")).allowed,false);
    for (const role of ['anon','authenticated']) {
      await db.exec(`SET ROLE ${role}`);
      for (const table of ['users','pedidos','vendas','parcelas_venda','vendas_ativas','fornecedor_stats']) {
        await denied(`SELECT * FROM public.${table}`);
        await denied(`DELETE FROM public.${table}`);
      }
      await denied('TRUNCATE public.users');
      await denied("INSERT INTO public.users(email,full_name,is_admin) VALUES('evil@example.invalid','Evil',true)");
      await denied('SELECT public.excluir_usuario_permanentemente(1)');
    }
    await db.exec(`SET ROLE anon`);
    await denied('SELECT * FROM public.mensagens');
    await db.exec(`SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false)`);
    check((await one('SELECT count(*)::int AS n FROM public.mensagens')).n,1);
    await db.exec("INSERT INTO public.mensagens(id_remetente,id_destinatario,mensagem) VALUES(1,2,'Permitida')");
    await denied("INSERT INTO public.mensagens(id_remetente,id_destinatario,mensagem) VALUES(2,3,'Falsificada')");
    await denied("INSERT INTO public.mensagens(id_remetente,id_destinatario,mensagem) VALUES(1,2,' ')");
    await denied("INSERT INTO public.mensagens(id,created_at,id_remetente,id_destinatario,mensagem) VALUES(55,now(),1,2,'ID forjado')");
    await denied("UPDATE public.mensagens SET mensagem='Adulterada'");
    await denied('DELETE FROM public.mensagens');
    await db.exec("SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false)");
    check((await one('SELECT count(*)::int AS n FROM public.mensagens')).n,2);
    for (const suffix of ['3','4']) {
      await db.exec(`SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000000${suffix}',false)`);
      check((await one('SELECT count(*)::int AS n FROM public.mensagens')).n,0);
    }
    await denied("INSERT INTO public.mensagens(id_remetente,id_destinatario,mensagem) VALUES(4,2,'Sem confirmacao')");
    await db.exec('SET ROLE service_role');
    check((await one('SELECT count(*)::int AS n FROM public.users')).n,4);
    await db.exec("INSERT INTO public.users(email,full_name) VALUES('backend@example.invalid','Backend'); UPDATE public.users SET full_name='Backend atualizado' WHERE email='backend@example.invalid'");
    check((await one("SELECT full_name FROM public.users WHERE email='backend@example.invalid'")).full_name,'Backend atualizado');
    await db.exec('RESET ROLE;');
    await db.exec("INSERT INTO public.users(email,full_name) VALUES('ALICE@example.invalid','Duplicada')");
    await db.exec("SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false)");
    check((await one('SELECT public.bigpecas_current_profile_id() AS id')).id,null);
    check((await one('SELECT count(*)::int AS n FROM public.mensagens')).n,0);
    console.log(`${checks} verificacoes da migration de seguranca aprovadas localmente. Nenhuma execucao remota.`);
  } finally { await db.close(); }
})().catch(error => { console.error(error.message); process.exitCode=1; });
