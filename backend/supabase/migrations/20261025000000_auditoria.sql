-- Configuracao e historico centralizado de auditoria.
create table if not exists public.audit_functionalities (
  key text primary key,
  label text not null,
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by bigint references public.users(id) on delete set null
);

insert into public.audit_functionalities (key, label, enabled) values
  ('home', 'Página inicial', false),
  ('usuarios', 'Cadastro e gestão de usuários', false),
  ('cadastro_peca', 'Cadastro de peça', true),
  ('catalogo', 'Catálogo e detalhes de peças', false),
  ('perfil', 'Perfil do usuário e fornecedor', false),
  ('favoritos', 'Lista de desejos', false),
  ('carrinho', 'Carrinho', false),
  ('checkout', 'Checkout', false),
  ('pedidos', 'Pedidos', true),
  ('avaliacao', 'Avaliações', true),
  ('chat', 'Chat', false),
  ('notificacoes', 'Notificações', false),
  ('configuracoes', 'Configurações', false),
  ('avaliador', 'Validação de peças', false),
  ('admin', 'Administração', false),
  ('auditoria', 'Auditoria', false)
on conflict (key) do nothing;

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  functionality_key text not null references public.audit_functionalities(key),
  event_type text not null check (event_type in ('navigation', 'database', 'backend')),
  action text not null,
  page_path text,
  http_method text,
  endpoint text,
  status_code integer,
  success boolean not null default true,
  actor_auth_id uuid,
  actor_user_id bigint references public.users(id) on delete set null,
  actor_email text,
  actor_name text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_functionality_idx on public.audit_logs (functionality_key, created_at desc);
create index if not exists audit_logs_actor_idx on public.audit_logs (actor_email, created_at desc);

alter table public.audit_functionalities enable row level security;
alter table public.audit_logs enable row level security;

comment on table public.audit_logs is
  'Eventos relevantes de navegacao, persistencia e backend, acessados somente pela API protegida.';

notify pgrst, 'reload schema';
