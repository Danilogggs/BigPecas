-- Papel administrativo do BigPecas.
-- Novos cadastros nunca sao administradores por padrao.
alter table public.users
  add column if not exists is_admin boolean not null default false;

create index if not exists users_is_admin_idx
  on public.users (is_admin)
  where is_admin = true;

comment on column public.users.is_admin is
  'Permite acesso as rotas administrativas do backend. Nunca aceitar este campo no cadastro/perfil publico.';

-- Mesmo que uma policy antiga permita ao usuario atualizar o proprio perfil,
-- chamadas feitas com anon/authenticated nao podem elevar esse privilegio.
create or replace function public.proteger_is_admin()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.is_admin is distinct from old.is_admin
     and current_user not in ('postgres', 'service_role', 'supabase_admin') then
    raise exception 'A permissao administrativa so pode ser alterada pelo backend administrativo.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists users_proteger_is_admin on public.users;
create trigger users_proteger_is_admin
before update of is_admin on public.users
for each row execute function public.proteger_is_admin();

-- Execute UMA VEZ, trocando o email, para criar o primeiro administrador:
-- update public.users set is_admin = true where lower(email) = lower('admin@bigpecas.com');
