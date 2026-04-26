-- Execute apenas se sua tabela users ainda não estiver preparada.
-- A senha fica no Supabase Auth. Por isso, password_hash deve aceitar NULL.

alter table public.users
  alter column password_hash drop not null;

-- Recomendado para evitar emails duplicados na tabela public.users.
create unique index if not exists users_email_unique_idx
  on public.users (lower(email));
