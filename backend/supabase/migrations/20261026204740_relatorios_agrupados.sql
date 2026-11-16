-- Relatorios somente de leitura. Precos e nomes vem do snapshot da compra.
-- A API autentica o administrador e resolve o fornecedor da sessao.
create or replace function public.relatorio_pedidos_base(p_fornecedor bigint default null)
returns table (
  id text, user_id bigint, status text, criado_em timestamptz,
  pago_em timestamptz, itens jsonb, unidades bigint, valor numeric
)
language sql stable security invoker set search_path = '' as $$
  select p.id, p.user_id, p.status, p.criado_em,
    coalesce(pagamento.data, p.criado_em),
    coalesce(produtos.itens, '[]'::jsonb),
    coalesce(produtos.unidades, 0), coalesce(produtos.valor, 0)
  from public.pedidos p
  left join lateral (
    select nullif(e.item->>'data', '')::timestamptz as data
    from jsonb_array_elements(coalesce(p.historico, '[]'::jsonb))
      with ordinality e(item, posicao)
    where e.item->>'status' = 'pago'
    order by e.posicao desc limit 1
  ) pagamento on true
  left join lateral (
    select jsonb_agg(i.item order by i.posicao) as itens,
      sum(coalesce(nullif(i.item->>'quantidade','')::integer, 1))::bigint as unidades,
      sum(coalesce(nullif(i.item->>'preco','')::numeric, 0)
        * coalesce(nullif(i.item->>'quantidade','')::integer, 1)) as valor
    from jsonb_array_elements(p.itens) with ordinality i(item, posicao)
    where p_fornecedor is null or coalesce(
      nullif(i.item->>'fornecedor_id','')::bigint,
      (select c.fornecedor_id from public.pecas c where c.id::text = i.item->>'id')
    ) = p_fornecedor
  ) produtos on true
  where p_fornecedor is null or produtos.itens is not null
$$;

-- Contagens operacionais por criacao; vendas efetivadas por pagamento.
create or replace function public.relatorio_metricas(
  p_inicio timestamptz, p_fim timestamptz,
  p_fornecedor bigint default null, p_status text default null
) returns jsonb language sql stable security invoker set search_path = '' as $$
  with base as materialized (
    select * from public.relatorio_pedidos_base(p_fornecedor)
    where p_status is null or status = p_status
  ), operacao as (
    select count(*) as pedidos,
      count(*) filter (where status = 'entregue') as entregues,
      count(*) filter (where status = 'cancelado') as cancelados
    from base where (p_inicio is null or criado_em >= p_inicio) and criado_em < p_fim
  ), vendas as (
    select count(*) as pedidos_pagos, coalesce(sum(valor),0) as faturamento
    from base where status in ('pago','enviado','entregue')
      and (p_inicio is null or pago_em >= p_inicio) and pago_em < p_fim
  )
  select jsonb_build_object(
    'pedidos', o.pedidos, 'pedidos_pagos', v.pedidos_pagos,
    'faturamento', v.faturamento,
    'ticket_medio', coalesce(v.faturamento / nullif(v.pedidos_pagos,0),0),
    'taxa_conclusao', coalesce(100.0 * o.entregues / nullif(o.pedidos,0),0),
    'taxa_cancelamento', coalesce(100.0 * o.cancelados / nullif(o.pedidos,0),0)
  ) from operacao o cross join vendas v
$$;

create or replace function public.obter_dashboard_agrupado(
  p_dias integer default 30, p_status text default null,
  p_fornecedor bigint default null, p_granularidade text default 'semanal',
  p_agora timestamptz default now()
) returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare
  inicio timestamptz;
  passo interval;
  unidade text;
  grafico_inicio timestamp;
  grafico_fim timestamp;
  resultado jsonb;
begin
  if p_dias is null or p_dias not in (0,7,30,90,365)
    or p_granularidade is null or p_granularidade not in ('diario','semanal','mensal')
    or p_agora is null or (p_fornecedor is not null and p_fornecedor <= 0)
    or (p_status is not null and p_status not in ('aguardando_pagamento','pago','enviado','entregue','cancelado')) then
    raise exception 'Filtros invalidos para o dashboard.';
  end if;
  inicio := case when p_dias = 0 then null else p_agora - make_interval(days => p_dias) end;
  unidade := case p_granularidade when 'diario' then 'day' when 'mensal' then 'month' else 'week' end;
  passo := case p_granularidade when 'diario' then interval '1 day' when 'mensal' then interval '1 month' else interval '1 week' end;
  grafico_fim := date_trunc(unidade, p_agora at time zone 'America/Sao_Paulo');
  select date_trunc(unidade, coalesce(inicio, min(pago_em), p_agora) at time zone 'America/Sao_Paulo')
    into grafico_inicio from public.relatorio_pedidos_base(p_fornecedor)
    where status in ('pago','enviado','entregue') and pago_em < p_agora
      and (p_status is null or status = p_status);

  with base as materialized (
    select * from public.relatorio_pedidos_base(p_fornecedor)
    where p_status is null or status = p_status
  ), operacao as (
    select * from base where (inicio is null or criado_em >= inicio) and criado_em < p_agora
  ), vendas as (
    select * from base where status in ('pago','enviado','entregue')
      and (inicio is null or pago_em >= inicio) and pago_em < p_agora
  ), por_status as (
    select status, count(*) as quantidade from operacao group by status
  ), por_data as (
    select date_trunc(unidade, pago_em at time zone 'America/Sao_Paulo') as data,
      sum(valor) as valor, count(*) as pedidos
    from vendas group by 1
  ), serie as (
    select g.data::date as data, coalesce(v.valor,0) as value,
      coalesce(v.pedidos,0) as orders,
      coalesce(v.valor / nullif(v.pedidos,0),0) as ticket
    from generate_series(grafico_inicio, grafico_fim, passo) g(data)
    left join por_data v on v.data = g.data
  ), produtos as (
    select i.item->>'id' as id,
      max(coalesce(i.item->>'nome',i.item->>'nome_peca','Peça')) as name,
      sum(coalesce((i.item->>'quantidade')::integer,1)) as units,
      sum(coalesce((i.item->>'preco')::numeric,0) * coalesce((i.item->>'quantidade')::integer,1)) as revenue
    from vendas v cross join lateral jsonb_array_elements(v.itens) i(item)
    group by i.item->>'id' order by units desc, id limit 5
  ), estoque as (
    select id,nome_peca,sku,estoque_atual from public.pecas
    where status_publicacao = 'publicada' and estoque_atual <= 3
      and (p_fornecedor is null or fornecedor_id = p_fornecedor)
    order by estoque_atual,id limit 5
  ), fornecedores as (
    select distinct coalesce(nullif(i.item->>'fornecedor_id','')::bigint,c.fornecedor_id) as id,
      coalesce(u.nome_loja,u.full_name,i.item->>'fornecedor_nome','Fornecedor') as nome
    from public.pedidos p cross join lateral jsonb_array_elements(p.itens) i(item)
    left join public.pecas c on c.id::text = i.item->>'id'
    left join public.users u on u.id = coalesce(nullif(i.item->>'fornecedor_id','')::bigint,c.fornecedor_id)
  ), recentes_pedidos as (
    select id,status,total,criado_em from public.pedidos order by criado_em desc,id limit 5
  ), recentes_usuarios as (
    select id,full_name,created_at from public.users
    where email not like 'deleted+%@removed.bigpecas'
    order by created_at desc,id limit 4
  ), reputacao as (
    select a.fornecedor_id as id, coalesce(u.nome_loja,u.full_name,'Fornecedor') as name,
      count(*) as count, avg(a.nota) as average
    from public.avaliacoes_fornecedor a join public.users u on u.id = a.fornecedor_id
    where a.verificada = true
    group by a.fornecedor_id,u.nome_loja,u.full_name
    order by average desc,count desc,a.fornecedor_id limit 6
  )
  select jsonb_build_object(
    'metricas', public.relatorio_metricas(inicio,p_agora,p_fornecedor,p_status),
    'anteriores', case when inicio is null then null else public.relatorio_metricas(inicio - make_interval(days => p_dias),inicio,p_fornecedor,p_status) end,
    'status', coalesce((select jsonb_object_agg(status,quantidade) from por_status),'{}'::jsonb),
    'serie', coalesce((select jsonb_agg(to_jsonb(s) order by s.data) from serie s),'[]'::jsonb),
    'produtos', coalesce((select jsonb_agg(to_jsonb(p) order by p.units desc,p.id) from produtos p),'[]'::jsonb),
    'estoque', coalesce((select jsonb_agg(to_jsonb(e) order by e.estoque_atual,e.id) from estoque e),'[]'::jsonb),
    'fornecedores', coalesce((select jsonb_agg(to_jsonb(f) order by f.nome,f.id) from fornecedores f where f.id is not null),'[]'::jsonb),
    'pedidos', coalesce((select jsonb_agg(to_jsonb(p) order by p.criado_em desc,p.id) from recentes_pedidos p),'[]'::jsonb),
    'usuarios', coalesce((select jsonb_agg(to_jsonb(u) order by u.created_at desc,u.id) from recentes_usuarios u),'[]'::jsonb),
    'reputacao', coalesce((select jsonb_agg(to_jsonb(r) order by r.average desc,r.count desc,r.id) from reputacao r),'[]'::jsonb)
  ) into resultado;
  return resultado;
end $$;

-- JSON escalar evita o limite de linhas do PostgREST no resumo.
-- A pagina e o Excel usam o mesmo recorte e ordenacao deterministica.
create or replace function public.obter_relatorio_vendedor(
  p_fornecedor bigint, p_inicio timestamptz, p_fim timestamptz,
  p_limite integer default 50, p_offset integer default 0
) returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare resultado jsonb;
begin
  if p_fornecedor is null or p_fornecedor <= 0 or p_inicio is null or p_fim is null
    or p_inicio >= p_fim or p_limite is null or p_limite not between 1 and 100
    or p_offset is null or p_offset < 0 then
    raise exception 'Filtros invalidos para o relatorio.';
  end if;
  with vendas as materialized (
    select * from public.relatorio_pedidos_base(p_fornecedor)
    where status in ('pago','enviado','entregue') and pago_em >= p_inicio and pago_em < p_fim
  ), pagina as (
    select v.id,v.status,v.pago_em as paid_at,
      coalesce(u.nome_loja,u.full_name,'Cliente BigPeças') as buyer,
      v.valor as total, v.unidades as units,
      (select jsonb_agg(jsonb_build_object(
        'id',i.item->>'id', 'name',coalesce(i.item->>'nome',i.item->>'nome_peca','Peça'),
        'sku',i.item->>'sku', 'quantity',coalesce((i.item->>'quantidade')::integer,1),
        'unit_price',coalesce((i.item->>'preco')::numeric,0),
        'total',coalesce((i.item->>'preco')::numeric,0) * coalesce((i.item->>'quantidade')::integer,1)
      ) order by i.posicao) from jsonb_array_elements(v.itens) with ordinality i(item,posicao)) as items
    from vendas v left join public.users u on u.id = v.user_id
    order by v.pago_em desc,v.id limit p_limite offset p_offset
  )
  select jsonb_build_object(
    'summary', (select jsonb_build_object('orders',count(*),'units',coalesce(sum(unidades),0),'revenue',coalesce(sum(valor),0)) from vendas),
    'sales', coalesce((select jsonb_agg(to_jsonb(p) order by p.paid_at desc,p.id) from pagina p),'[]'::jsonb)
  ) into resultado;
  return resultado;
end $$;

-- Regra: um anuncio nao pode ter duas revisoes aguardando decisao ao mesmo tempo.
-- Se houver legado inconsistente, a migration falha sem descartar registros.
create unique index if not exists avaliacoes_pecas_uma_pendente_uidx
  on public.avaliacoes_pecas (peca_id) where status = 'pendente';
create index if not exists pedidos_criado_em_idx on public.pedidos (criado_em desc);

revoke all on function public.relatorio_pedidos_base(bigint) from public,anon,authenticated;
revoke all on function public.relatorio_metricas(timestamptz,timestamptz,bigint,text) from public,anon,authenticated;
revoke all on function public.obter_dashboard_agrupado(integer,text,bigint,text,timestamptz) from public,anon,authenticated;
revoke all on function public.obter_relatorio_vendedor(bigint,timestamptz,timestamptz,integer,integer) from public,anon,authenticated;
grant execute on function public.relatorio_pedidos_base(bigint) to service_role;
grant execute on function public.relatorio_metricas(timestamptz,timestamptz,bigint,text) to service_role;
grant execute on function public.obter_dashboard_agrupado(integer,text,bigint,text,timestamptz) to service_role;
grant execute on function public.obter_relatorio_vendedor(bigint,timestamptz,timestamptz,integer,integer) to service_role;
notify pgrst, 'reload schema';
