// PostgreSQL real em memoria: nenhuma conexao ou fixture remota.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');

test('relatorios SQL, isolamento, paginacao, datas e indices de negocio', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth;
      create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
    `);
    const root = path.resolve(__dirname, '../../backend/supabase');
    await db.exec(fs.readFileSync(path.join(root, 'setup-devqas.sql'), 'utf8'));
    const migration = fs.readFileSync(path.join(root, 'migrations/20261026204740_relatorios_agrupados.sql'), 'utf8');
    await db.exec(migration);
    await db.exec(migration); // reexecucao nao duplica indices nem altera dados
    await db.exec(`
      insert into public.users(email,full_name) values ('a@test','Loja A'),('b@test','Loja B'),('c@test','Cliente');
      insert into public.pecas(nome_peca,preco,preco_base,fornecedor_id,estoque_atual)
        values ('Atual A',999,999,1,10),('Atual B',999,999,2,10);
    `);
    const itens = [
      {id:1,nome:'Historico A',fornecedor_id:1,preco:10,quantidade:2},
      {id:2,nome:'Historico B',fornecedor_id:2,preco:30,quantidade:1},
    ];
    async function pedido(id, status, created, paid = created, items = itens) {
      await db.query(`insert into pedidos(id,user_id,status,itens,endereco,forma_pagamento,subtotal,total,criado_em,historico)
        values ($1,3,$2,$3,'{}','{}',50,99,$4,$5)`,
      [id,status,JSON.stringify(items),created,JSON.stringify([{status:'pago',data:paid}])]);
    }
    await pedido('pago','pago','2026-10-20T12:00:00Z');
    await pedido('pendente','aguardando_pagamento','2026-10-21T12:00:00Z');
    await pedido('cancelado','cancelado','2026-10-22T12:00:00Z');
    await pedido('antigo-pago-agora','entregue','2026-08-01T12:00:00Z','2026-10-23T01:30:00Z');
    // Igual ao limite superior: nao deve entrar no periodo fechado-aberto.
    await pedido('futuro','pago','2026-10-26T12:00:00Z');
    const dashboard = async (days=7, status=null, supplier=null, granularity='diario') =>
      (await db.query('select obter_dashboard_agrupado($1,$2,$3,$4,$5) as r',
        [days,status,supplier,granularity,'2026-10-26T12:00:00Z'])).rows[0].r;
    const report = async (supplier=1, limit=50, offset=0) =>
      (await db.query('select obter_relatorio_vendedor($1,$2,$3,$4,$5) as r',
        [supplier,'2026-10-19T12:00:00Z','2026-10-26T12:00:00Z',limit,offset])).rows[0].r;

    const all = await dashboard();
    assert.equal(all.metricas.pedidos,3); // criacao, nao pagamento
    assert.equal(all.metricas.faturamento,100); // precos historicos, nao total/frete nem catalogo atual
    assert.equal(all.metricas.ticket_medio,50);
    assert.equal(all.status.aguardando_pagamento,1);
    assert.equal((await dashboard(7,'aguardando_pagamento')).metricas.faturamento,0);
    assert.equal((await dashboard(7,null,1)).metricas.faturamento,40);
    assert.equal(all.serie.find(d => d.data === '2026-10-22').value,50); // 01:30 UTC e dia anterior em SP
    assert.equal(all.serie.reduce((sum,d) => sum+d.value,0),100);
    assert.equal(all.serie.some(d => d.value === 0),true);
    assert.equal(all.produtos.find(p => p.id === '1').units,4);
    assert.equal((await dashboard(0)).anteriores,null);
    assert.equal((await dashboard(7,null,null,'mensal')).serie.length,1);
    const a = await report();
    assert.deepEqual(a.summary,{orders:2,units:4,revenue:40});
    assert.equal(a.sales[0].items[0].name,'Historico A');
    assert.equal(a.sales.every(s => s.items.length === 1),true);
    assert.equal((await report(2)).summary.revenue,60);
    assert.deepEqual((await report(999)).summary,{orders:0,units:0,revenue:0});
    assert.equal((await report(1,1,0)).sales[0].id,'antigo-pago-agora');
    assert.equal((await report(1,1,1)).sales[0].id,'pago');
    assert.equal((await report(1,1,99)).sales.length,0);
    assert.equal((await report(1,1,99)).summary.orders,2);

    // Mais que o limite habitual da Data API; resumo e pagina continuam completos.
    await db.exec(`insert into pedidos(id,user_id,status,itens,endereco,forma_pagamento,subtotal,total,criado_em)
      select 'volume-'||g,3,'pago','[{"id":1,"nome":"Volume","fornecedor_id":1,"preco":1,"quantidade":1}]'::jsonb,
        '{}','{}',1,1,'2026-10-25T12:00:00Z' from generate_series(1,1005) g`);
    assert.equal((await report()).summary.orders,1007);
    assert.equal((await report(1,100,1000)).sales.length,7);
    assert.equal((await dashboard()).metricas.faturamento,1105);
    await assert.rejects(dashboard(8));
    await assert.rejects(report(null));
    await assert.rejects(report(1,101));

    // Regra de negocio nova e duas garantias ja existentes.
    await assert.rejects(db.exec(`insert into avaliacoes_pecas(peca_id,revisao,criterios_snapshot)
      values (1,2,'[]')`), {code:'23505'});
    await db.exec('insert into wishlist(user_id,peca_id) values (3,1)');
    await assert.rejects(db.exec('insert into wishlist(user_id,peca_id) values (3,1)'), {code:'23505'});
    await db.exec(`insert into vendas(peca_id,fornecedor_id,comprador_id,quantidade,preco_unitario,preco_total,forma_pagamento,pedido_id,item_indice)
      values (1,1,3,2,10,20,'Pix','pago',0)`);
    await assert.rejects(db.exec(`insert into vendas(peca_id,fornecedor_id,comprador_id,quantidade,preco_unitario,preco_total,forma_pagamento,pedido_id,item_indice)
      values (1,1,3,2,10,20,'Pix','pago',0)`),{code:'23505'});
    for (const role of ['anon','authenticated']) {
      await db.exec(`set role ${role}`);
      await assert.rejects(dashboard(),{code:'42501'});
      await assert.rejects(report(),{code:'42501'});
      await db.exec('reset role');
    }
    await db.exec('set role service_role');
    assert.equal((await report()).summary.orders,1007);
    assert.equal((await dashboard()).metricas.faturamento,1105);
  } finally { await db.close(); }
});
