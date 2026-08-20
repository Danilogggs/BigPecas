-- Preferencias persistentes do painel, uma configuracao por administrador.
create table if not exists public.admin_dashboard_preferences (
  user_id bigint primary key references public.users(id) on delete cascade,
  config jsonb not null default '{"widgets":["usuarios","pecas","pedidos","pedidos_pendentes","avaliacoes"]}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.admin_dashboard_preferences enable row level security;

-- Nao ha policies para anon/authenticated: a tabela e acessada exclusivamente
-- pelo backend, que usa service_role depois de validar o administrador.
comment on table public.admin_dashboard_preferences is
  'Preferencias de widgets do painel administrativo, acessadas somente pelo backend.';

-- Solicita ao PostgREST/Supabase que reconheca imediatamente a nova tabela.
notify pgrst, 'reload schema';
