-- Mantém o snapshot histórico da revisão, mas deixa de exigir critérios que
-- foram inativados enquanto a peça ainda aguardava avaliação.
create or replace function public.decidir_avaliacao_peca(
  p_peca bigint, p_avaliador bigint, p_revisao integer, p_respostas jsonb,
  p_comentarios text default '', p_rejeitar boolean default false
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  p public.pecas;
  a public.avaliacoes_pecas;
  c jsonb;
  r jsonb;
  criterios_ativos jsonb;
  aprovada boolean;
begin
  if not exists (select 1 from public.users where id=p_avaliador and (tipo_usuario='avaliador' or is_admin)) then
    raise exception 'Usuário sem permissão para avaliar.';
  end if;
  select * into p from public.pecas where id=p_peca for update;
  if not found or p.status_publicacao <> 'pendente_validacao' or p.revisao_avaliacao <> p_revisao then
    raise exception 'O anúncio mudou ou já foi avaliado. Recarregue a fila.';
  end if;
  if p.fornecedor_id=p_avaliador and not exists (
    select 1 from public.users where id=p_avaliador and is_admin=true
  ) then
    raise exception 'Somente administradores podem avaliar o próprio anúncio.';
  end if;
  select * into a from public.avaliacoes_pecas where peca_id=p_peca and revisao=p_revisao for update;
  if not found or a.status <> 'pendente' then raise exception 'Avaliação indisponível.'; end if;
  if jsonb_typeof(p_respostas) is distinct from 'array' then raise exception 'Checklist inválido.'; end if;

  select coalesce(jsonb_agg(snapshot_item), '[]'::jsonb)
    into criterios_ativos
    from jsonb_array_elements(a.criterios_snapshot) snapshot_item
    join public.checklist_validacao_peca criterio
      on criterio.id = (snapshot_item->>'id')::bigint
     and criterio.ativo = true;

  if jsonb_array_length(p_respostas) <> jsonb_array_length(criterios_ativos) then
    raise exception 'Responda todos os critérios ativos desta revisão.';
  end if;
  if exists (select 1 from jsonb_array_elements(p_respostas) x
    group by x->>'criterio_id' having count(*)>1) then raise exception 'Critérios duplicados.'; end if;

  aprovada := jsonb_array_length(criterios_ativos)>0;
  for c in select * from jsonb_array_elements(criterios_ativos) loop
    select x into r from jsonb_array_elements(p_respostas) x where x->>'criterio_id'=c->>'id';
    if r is null or jsonb_typeof(r->'resposta') is distinct from 'boolean' then
      raise exception 'Resposta ausente ou inválida.';
    end if;
    if (c->>'obrigatorio')::boolean and not (r->>'resposta')::boolean then aprovada:=false; end if;
  end loop;
  if p_rejeitar then
    if length(trim(coalesce(p_comentarios,'')))=0 then raise exception 'Informe o motivo da reprovação.'; end if;
    aprovada:=false;
  elsif not aprovada then
    raise exception 'Marque positivamente todos os critérios obrigatórios ou reprove com motivo.';
  end if;

  update public.avaliacoes_pecas set avaliador_id=p_avaliador, respostas=p_respostas,
    comentarios=p_comentarios, decidida_em=now(), status=case when aprovada then 'aprovada' else 'rejeitada' end
    where id=a.id;
  update public.pecas set status_publicacao=case when aprovada then 'publicada' else 'rejeitada' end,
    publicada_em=case when aprovada then now() else null end,
    motivo_rejeicao=case when aprovada then null else p_comentarios end, requer_revalidacao=not aprovada
    where id=p_peca;
  insert into public.notificacoes(user_id,tipo,titulo,mensagem,status_envio,peca_id)
    values (p.fornecedor_id::text,case when aprovada then 'validacao_aprovada' else 'validacao_rejeitada' end,
      case when aprovada then 'Peça aprovada e publicada' else 'Peça reprovada' end,
      case when aprovada then 'Seu anúncio está disponível no catálogo.' else p_comentarios end,'enviada',p_peca);
  return jsonb_build_object('publicada',aprovada,'status',case when aprovada then 'aprovada' else 'rejeitada' end);
end $$;

revoke all on function public.decidir_avaliacao_peca(bigint,bigint,integer,jsonb,text,boolean)
  from public, anon, authenticated;
grant execute on function public.decidir_avaliacao_peca(bigint,bigint,integer,jsonb,text,boolean)
  to service_role;

notify pgrst, 'reload schema';
