-- BigPecas — baseline do schema base.
--
-- Consolida em migration versionada as tabelas que antes existiam apenas em
-- supabase/DATABASE_SCHEMA_UPDATED.sql (arquivo marcado como "not meant to be
-- run", com tabelas fora da ordem de dependencia de chave estrangeira).
--
-- Representa o schema ANTES das migrations datadas: as colunas e tabelas
-- introduzidas depois (is_admin, moeda_padrao, status_publicacao,
-- avaliacoes_produto, admin_dashboard_preferences, ...) sao adicionadas pelas
-- migrations seguintes, nao aqui.
--
-- Bancos que ja possuem essas tabelas NAO devem executar este arquivo:
-- use `npm run migrate:baseline` para registra-lo como aplicado.
-- Tudo abaixo e idempotente, entao uma execucao acidental nao destroi dados.

-- ---------------------------------------------------------------------------
-- 1. Tabelas sem dependencias
-- ---------------------------------------------------------------------------

create table if not exists public.users (
  id bigint generated always as identity primary key,
  email varchar not null unique,
  full_name varchar not null,
  gender varchar,
  cep varchar,
  tipo_usuario varchar default 'comprador',
  nome_loja varchar,
  descricao_loja text,
  telefone varchar,
  created_at timestamp default current_timestamp,
  updated_at timestamp default current_timestamp,
  email_verificado boolean default false,
  time_futebol text,
  sabor_pizza text,
  receber_email_notificacao_venda boolean not null default true
);

create table if not exists public.marcas (
  id bigint generated always as identity primary key,
  nome varchar not null unique
);

create table if not exists public.categorias (
  id bigint generated always as identity primary key,
  nome varchar not null unique
);

create table if not exists public.materiais (
  id bigint generated always as identity primary key,
  nome varchar not null unique
);

create table if not exists public.mensagens (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  id_remetente bigint,
  id_destinatario bigint,
  mensagem text
);

-- user_id e text porque a tabela e gravada com o identificador do Supabase Auth.
create table if not exists public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  pedido_id text,
  tipo text not null,
  titulo text not null,
  mensagem text not null,
  status_envio text not null default 'pendente',
  lida_em timestamptz,
  criada_em timestamptz not null default now(),
  email_destino text
);

create table if not exists public.checklist_validacao_peca (
  id bigint generated always as identity primary key,
  nome_criterio varchar not null,
  descricao text,
  obrigatorio boolean default true,
  ordem integer,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now()
);

create table if not exists public.categorias_preco_filtro (
  id bigint generated always as identity primary key,
  moeda varchar not null,
  categoria varchar not null,
  valor_minimo numeric not null,
  valor_maximo numeric not null,
  descricao_traduzida jsonb,
  icone varchar,
  ordem integer,
  constraint categorias_preco_filtro_moeda_categoria_key unique (moeda, categoria)
);

-- ---------------------------------------------------------------------------
-- 2. Dependem de users / marcas
-- ---------------------------------------------------------------------------

create table if not exists public.modelos (
  id bigint generated always as identity primary key,
  marca_id bigint not null references public.marcas(id),
  nome varchar not null
);

-- pedidos precisa existir antes de vendas: no arquivo de referencia ele
-- aparecia depois, o que tornava o script nao executavel.
create table if not exists public.pedidos (
  id text primary key,
  user_id bigint not null references public.users(id),
  status text not null default 'aguardando_pagamento',
  itens jsonb not null,
  frete jsonb,
  cupom jsonb,
  endereco jsonb not null,
  forma_pagamento jsonb not null,
  subtotal numeric not null,
  desconto numeric default 0,
  valor_frete numeric default 0,
  total numeric not null,
  codigo_rastreio text,
  historico jsonb default '[]'::jsonb,
  criado_em timestamptz default now(),
  data_preferida date,
  urgencia_entrega text
);

create table if not exists public.pecas (
  id bigint generated always as identity primary key,
  nome_peca varchar not null,
  sku varchar unique,
  oem_number varchar,
  num_serie varchar,
  categoria_id bigint references public.categorias(id),
  material_id bigint references public.materiais(id),
  condicao varchar,
  peso_gramas integer,
  comprimento_mm integer,
  largura_mm integer,
  altura_mm integer,
  detalhes_gravacao text,
  historico_proveniencia text,
  fornecedor_id bigint not null references public.users(id),
  preco numeric not null,
  estoque_atual integer default 0,
  status varchar default 'disponivel',
  data_cadastro timestamp default current_timestamp,
  updated_at timestamp default current_timestamp,
  imagem text,
  fabricante varchar
);

-- ---------------------------------------------------------------------------
-- 3. Dependem de pecas / pedidos
-- ---------------------------------------------------------------------------

create table if not exists public.peca_compatibilidade (
  id bigint generated always as identity primary key,
  peca_id bigint not null references public.pecas(id),
  modelo_id bigint not null references public.modelos(id),
  ano_inicio integer,
  ano_fim integer,
  observacao_ajuste varchar
);

create table if not exists public.validacao_peca (
  id bigint generated always as identity primary key,
  peca_id bigint not null unique references public.pecas(id),
  avaliador_id bigint not null references public.users(id),
  status varchar default 'pendente',
  comentarios text,
  validada_em timestamptz,
  criada_em timestamptz default now()
);

create table if not exists public.checklist_respostas_validacao (
  id bigint generated always as identity primary key,
  validacao_id bigint not null references public.validacao_peca(id),
  criterio_id bigint not null references public.checklist_validacao_peca(id),
  resposta boolean not null,
  observacao text
);

create table if not exists public.faixas_preco (
  id bigint generated always as identity primary key,
  peca_id bigint not null references public.pecas(id),
  moeda varchar not null,
  preco_minimo numeric not null,
  preco_maximo numeric not null,
  taxa_conversao numeric not null default 1.0,
  atualizado_em timestamptz default now(),
  constraint faixas_preco_peca_moeda_key unique (peca_id, moeda)
);

create table if not exists public.vendas (
  id bigint generated always as identity primary key,
  peca_id bigint not null references public.pecas(id),
  fornecedor_id bigint not null references public.users(id),
  comprador_id bigint not null references public.users(id),
  quantidade integer default 1,
  preco_unitario numeric not null,
  preco_total numeric not null,
  forma_pagamento varchar not null,
  parcelado boolean default false,
  numero_parcelas integer default 1,
  primeira_parcela_data date,
  juros_percentual numeric default 0,
  status varchar default 'pendente',
  data_venda timestamp default current_timestamp,
  data_entrega timestamp,
  cancelled_at timestamp
);

create table if not exists public.parcelas_venda (
  id bigint generated always as identity primary key,
  venda_id bigint not null references public.vendas(id),
  numero_parcela integer not null,
  valor_parcela numeric not null,
  valor_pago numeric default 0,
  data_vencimento date not null,
  data_pagamento date,
  status varchar default 'pendente'
);

create table if not exists public.avaliacoes_fornecedor (
  id bigint generated always as identity primary key,
  fornecedor_id bigint not null references public.users(id),
  comprador_id bigint not null references public.users(id),
  venda_id bigint unique references public.vendas(id),
  nota integer not null check (nota between 1 and 5),
  comentario text,
  qualidade_peca integer check (qualidade_peca between 1 and 5),
  comunicacao integer check (comunicacao between 1 and 5),
  rapidez_entrega integer check (rapidez_entrega between 1 and 5),
  embalagem integer check (embalagem between 1 and 5),
  verificada boolean default false,
  data_avaliacao timestamp default current_timestamp
);

create table if not exists public.wishlist (
  id bigint generated always as identity primary key,
  user_id bigint not null references public.users(id),
  peca_id bigint not null references public.pecas(id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 4. Indices de apoio
-- ---------------------------------------------------------------------------

create index if not exists idx_validacao_peca_status on public.validacao_peca (status);
create index if not exists idx_validacao_peca_avaliador on public.validacao_peca (avaliador_id);
create index if not exists idx_faixas_preco_moeda on public.faixas_preco (moeda);
create index if not exists idx_usuarios_tipo on public.users (tipo_usuario);
create index if not exists idx_pecas_fornecedor on public.pecas (fornecedor_id);
create index if not exists idx_vendas_comprador on public.vendas (comprador_id);
create index if not exists idx_pedidos_user on public.pedidos (user_id);
create index if not exists idx_notificacoes_user on public.notificacoes (user_id, criada_em desc);
create unique index if not exists wishlist_user_peca_uidx on public.wishlist (user_id, peca_id);

notify pgrst, 'reload schema';
