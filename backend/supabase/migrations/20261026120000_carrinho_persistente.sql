-- Carrinho salvo por usuario, para que os itens acompanhem a conta entre
-- navegadores e dispositivos (antes ficavam apenas no localStorage).
create table if not exists public.carrinhos (
  user_id bigint primary key references public.users(id) on delete cascade,
  itens jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.carrinhos enable row level security;

-- Sem policies para anon/authenticated: o backend acessa a tabela com
-- service_role depois de validar o token do usuario.
revoke all on table public.carrinhos from public, anon, authenticated;
grant select, insert, update, delete on table public.carrinhos to service_role;

comment on table public.carrinhos is
  'Itens do carrinho de cada usuario (peca_id e quantidade), acessados somente pelo backend.';

notify pgrst, 'reload schema';
