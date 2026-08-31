-- REFERÊNCIA LEGADA: para o schema vigente aplique 20260830_avaliacao_moeda_segura.sql.
-- A migration inclui revisões, snapshots, RLS, preço/moeda base e taxas de câmbio.
-- UPDATED DATABASE SCHEMA
-- Includes: Avaliador Profile, Piece Validation System, and Currency Internationalization
-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.users (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  email character varying NOT NULL UNIQUE,
  full_name character varying NOT NULL,
  gender character varying,
  cep character varying,
  tipo_usuario character varying DEFAULT 'comprador'::character varying, -- NEW: Can be 'comprador', 'vendedor', or 'avaliador'
  nome_loja character varying,
  descricao_loja text,
  telefone character varying,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  email_verificado boolean DEFAULT false,
  time_futebol text,
  sabor_pizza text,
  receber_email_notificacao_venda boolean NOT NULL DEFAULT true,
  is_admin boolean NOT NULL DEFAULT false,
  moeda_padrao character varying DEFAULT 'BRL', -- NEW: Default currency for the user
  pais_origem character varying DEFAULT 'BR', -- NEW: User's origin country
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

CREATE TABLE public.marcas (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nome character varying NOT NULL UNIQUE,
  CONSTRAINT marcas_pkey PRIMARY KEY (id)
);

CREATE TABLE public.modelos (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  marca_id bigint NOT NULL,
  nome character varying NOT NULL,
  CONSTRAINT modelos_pkey PRIMARY KEY (id),
  CONSTRAINT modelos_marca_id_fkey FOREIGN KEY (marca_id) REFERENCES public.marcas(id)
);

CREATE TABLE public.categorias (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nome character varying NOT NULL UNIQUE,
  CONSTRAINT categorias_pkey PRIMARY KEY (id)
);

CREATE TABLE public.materiais (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nome character varying NOT NULL UNIQUE,
  CONSTRAINT materiais_pkey PRIMARY KEY (id)
);

CREATE TABLE public.pecas (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nome_peca character varying NOT NULL,
  sku character varying UNIQUE,
  oem_number character varying,
  num_serie character varying,
  categoria_id bigint,
  material_id bigint,
  condicao character varying,
  peso_gramas integer,
  comprimento_mm integer,
  largura_mm integer,
  altura_mm integer,
  detalhes_gravacao text,
  historico_proveniencia text,
  fornecedor_id bigint NOT NULL,
  preco numeric NOT NULL,
  estoque_atual integer DEFAULT 0,
  status character varying DEFAULT 'disponivel'::character varying,
  data_cadastro timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  imagem text,
  fabricante character varying,
  status_publicacao character varying DEFAULT 'rascunho'::character varying, -- NEW: rascunho, pendente_validacao, validada, rejeitada, publicada
  url_video text, -- NEW: Video URL for piece validation
  motivo_rejeicao text, -- NEW: Reason for rejection if validation fails
  dados_api_validacao jsonb, -- NEW: Store API validation results (future use)
  requer_revalidacao boolean DEFAULT false, -- NEW: Flag if piece needs re-validation
  CONSTRAINT pecas_pkey PRIMARY KEY (id),
  CONSTRAINT pecas_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias(id),
  CONSTRAINT pecas_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materiais(id),
  CONSTRAINT pecas_fornecedor_id_fkey FOREIGN KEY (fornecedor_id) REFERENCES public.users(id)
);

CREATE TABLE public.peca_compatibilidade (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  peca_id bigint NOT NULL,
  modelo_id bigint NOT NULL,
  ano_inicio integer,
  ano_fim integer,
  observacao_ajuste character varying,
  CONSTRAINT peca_compatibilidade_pkey PRIMARY KEY (id),
  CONSTRAINT peca_compatibilidade_peca_id_fkey FOREIGN KEY (peca_id) REFERENCES public.pecas(id),
  CONSTRAINT peca_compatibilidade_modelo_id_fkey FOREIGN KEY (modelo_id) REFERENCES public.modelos(id)
);

-- NEW TABLE: Validation Checklist Criteria (Admin Configurable)
CREATE TABLE public.checklist_validacao_peca (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nome_criterio character varying NOT NULL,
  descricao text,
  obrigatorio boolean DEFAULT true,
  ordem integer,
  criado_em timestamp with time zone DEFAULT now(),
  atualizado_em timestamp with time zone DEFAULT now(),
  CONSTRAINT checklist_validacao_peca_pkey PRIMARY KEY (id)
);

-- NEW TABLE: Piece Validation Records
CREATE TABLE public.validacao_peca (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  peca_id bigint NOT NULL,
  avaliador_id bigint NOT NULL,
  status character varying DEFAULT 'pendente'::character varying, -- pendente, validada, rejeitada
  comentarios text,
  validada_em timestamp with time zone,
  criada_em timestamp with time zone DEFAULT now(),
  CONSTRAINT validacao_peca_pkey PRIMARY KEY (id),
  CONSTRAINT validacao_peca_peca_id_fkey FOREIGN KEY (peca_id) REFERENCES public.pecas(id),
  CONSTRAINT validacao_peca_avaliador_id_fkey FOREIGN KEY (avaliador_id) REFERENCES public.users(id),
  UNIQUE(peca_id)
);

-- NEW TABLE: Validation Checklist Responses
CREATE TABLE public.checklist_respostas_validacao (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  validacao_id bigint NOT NULL,
  criterio_id bigint NOT NULL,
  resposta boolean NOT NULL,
  observacao text,
  CONSTRAINT checklist_respostas_validacao_pkey PRIMARY KEY (id),
  CONSTRAINT checklist_respostas_validacao_validacao_id_fkey FOREIGN KEY (validacao_id) REFERENCES public.validacao_peca(id),
  CONSTRAINT checklist_respostas_validacao_criterio_id_fkey FOREIGN KEY (criterio_id) REFERENCES public.checklist_validacao_peca(id)
);

-- NEW TABLE: Price Ranges (Currency Internationalization)
CREATE TABLE public.faixas_preco (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  peca_id bigint NOT NULL,
  moeda character varying NOT NULL, -- BRL, USD, EUR, etc.
  preco_minimo numeric NOT NULL,
  preco_maximo numeric NOT NULL,
  taxa_conversao numeric NOT NULL DEFAULT 1.0,
  atualizado_em timestamp with time zone DEFAULT now(),
  CONSTRAINT faixas_preco_pkey PRIMARY KEY (id),
  CONSTRAINT faixas_preco_peca_id_fkey FOREIGN KEY (peca_id) REFERENCES public.pecas(id),
  UNIQUE(peca_id, moeda)
);

-- NEW TABLE: Price Categories Filter (Internationalized)
CREATE TABLE public.categorias_preco_filtro (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  moeda character varying NOT NULL,
  categoria character varying NOT NULL,
  valor_minimo numeric NOT NULL,
  valor_maximo numeric NOT NULL,
  descricao_traduzida jsonb, -- {PT: "...", EN: "...", FR: "..."}
  icone character varying,
  ordem integer,
  CONSTRAINT categorias_preco_filtro_pkey PRIMARY KEY (id),
  UNIQUE(moeda, categoria)
);

CREATE TABLE public.vendas (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  peca_id bigint NOT NULL,
  fornecedor_id bigint NOT NULL,
  comprador_id bigint NOT NULL,
  quantidade integer DEFAULT 1,
  preco_unitario numeric NOT NULL,
  preco_total numeric NOT NULL,
  forma_pagamento character varying NOT NULL,
  parcelado boolean DEFAULT false,
  numero_parcelas integer DEFAULT 1,
  primeira_parcela_data date,
  juros_percentual numeric DEFAULT 0,
  status character varying DEFAULT 'pendente'::character varying,
  data_venda timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  data_entrega timestamp without time zone,
  cancelled_at timestamp without time zone,
  pedido_id text,
  item_indice integer,
  CONSTRAINT vendas_pkey PRIMARY KEY (id),
  CONSTRAINT vendas_peca_id_fkey FOREIGN KEY (peca_id) REFERENCES public.pecas(id),
  CONSTRAINT vendas_fornecedor_id_fkey FOREIGN KEY (fornecedor_id) REFERENCES public.users(id),
  CONSTRAINT vendas_comprador_id_fkey FOREIGN KEY (comprador_id) REFERENCES public.users(id),
  CONSTRAINT vendas_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id)
);

CREATE TABLE public.parcelas_venda (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  venda_id bigint NOT NULL,
  numero_parcela integer NOT NULL,
  valor_parcela numeric NOT NULL,
  valor_pago numeric DEFAULT 0,
  data_vencimento date NOT NULL,
  data_pagamento date,
  status character varying DEFAULT 'pendente'::character varying,
  CONSTRAINT parcelas_venda_pkey PRIMARY KEY (id),
  CONSTRAINT parcelas_venda_venda_id_fkey FOREIGN KEY (venda_id) REFERENCES public.vendas(id)
);

CREATE TABLE public.avaliacoes_fornecedor (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  fornecedor_id bigint NOT NULL,
  comprador_id bigint NOT NULL,
  venda_id bigint UNIQUE,
  nota integer NOT NULL CHECK (nota >= 1 AND nota <= 5),
  comentario text,
  qualidade_peca integer CHECK (qualidade_peca >= 1 AND qualidade_peca <= 5),
  comunicacao integer CHECK (comunicacao >= 1 AND comunicacao <= 5),
  rapidez_entrega integer CHECK (rapidez_entrega >= 1 AND rapidez_entrega <= 5),
  embalagem integer CHECK (embalagem >= 1 AND embalagem <= 5),
  verificada boolean DEFAULT false,
  data_avaliacao timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  pedido_id text,
  CONSTRAINT avaliacoes_fornecedor_pkey PRIMARY KEY (id),
  CONSTRAINT avaliacoes_fornecedor_fornecedor_id_fkey FOREIGN KEY (fornecedor_id) REFERENCES public.users(id),
  CONSTRAINT avaliacoes_fornecedor_comprador_id_fkey FOREIGN KEY (comprador_id) REFERENCES public.users(id),
  CONSTRAINT avaliacoes_fornecedor_venda_id_fkey FOREIGN KEY (venda_id) REFERENCES public.vendas(id),
  CONSTRAINT avaliacoes_fornecedor_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id)
);

CREATE TABLE public.wishlist (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id bigint NOT NULL,
  peca_id bigint NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT wishlist_pkey PRIMARY KEY (id),
  CONSTRAINT whitelist_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT whitelist_peca_id_fkey FOREIGN KEY (peca_id) REFERENCES public.pecas(id)
);

CREATE TABLE public.mensagens (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  id_remetente bigint,
  id_destinatario bigint,
  mensagem text,
  CONSTRAINT mensagens_pkey PRIMARY KEY (id)
);

CREATE TABLE public.pedidos (
  id text NOT NULL,
  user_id bigint NOT NULL,
  status text NOT NULL DEFAULT 'aguardando_pagamento'::text,
  itens jsonb NOT NULL,
  frete jsonb,
  cupom jsonb,
  endereco jsonb NOT NULL,
  forma_pagamento jsonb NOT NULL,
  subtotal numeric NOT NULL,
  desconto numeric DEFAULT 0,
  valor_frete numeric DEFAULT 0,
  total numeric NOT NULL,
  codigo_rastreio text,
  historico jsonb DEFAULT '[]'::jsonb,
  criado_em timestamp with time zone DEFAULT now(),
  data_preferida date,
  urgencia_entrega text,
  CONSTRAINT pedidos_pkey PRIMARY KEY (id),
  CONSTRAINT pedidos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

CREATE TABLE public.avaliacoes_produto (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  pedido_id text NOT NULL,
  venda_id bigint NOT NULL,
  peca_id bigint NOT NULL,
  fornecedor_id bigint NOT NULL,
  comprador_id bigint NOT NULL,
  nota integer NOT NULL CHECK (nota >= 1 AND nota <= 5),
  comentario text,
  verificada boolean NOT NULL DEFAULT true,
  data_avaliacao timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT avaliacoes_produto_pkey PRIMARY KEY (id),
  CONSTRAINT avaliacoes_produto_fornecedor_id_fkey FOREIGN KEY (fornecedor_id) REFERENCES public.users(id),
  CONSTRAINT avaliacoes_produto_comprador_id_fkey FOREIGN KEY (comprador_id) REFERENCES public.users(id),
  CONSTRAINT avaliacoes_produto_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id),
  CONSTRAINT avaliacoes_produto_venda_id_fkey FOREIGN KEY (venda_id) REFERENCES public.vendas(id),
  CONSTRAINT avaliacoes_produto_peca_id_fkey FOREIGN KEY (peca_id) REFERENCES public.pecas(id)
);

CREATE TABLE public.admin_dashboard_preferences (
  user_id bigint NOT NULL,
  config jsonb NOT NULL DEFAULT '{"widgets": ["usuarios", "pecas", "pedidos", "pedidos_pendentes", "avaliacoes"]}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT admin_dashboard_preferences_pkey PRIMARY KEY (user_id),
  CONSTRAINT admin_dashboard_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

CREATE TABLE public.notificacoes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  pedido_id text,
  tipo text NOT NULL,
  titulo text NOT NULL,
  mensagem text NOT NULL,
  status_envio text NOT NULL DEFAULT 'pendente'::text,
  lida_em timestamp with time zone,
  criada_em timestamp with time zone NOT NULL DEFAULT now(),
  email_destino text,
  CONSTRAINT notificacoes_pkey PRIMARY KEY (id)
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_validacao_peca_status ON public.validacao_peca(status);
CREATE INDEX IF NOT EXISTS idx_validacao_peca_avaliador ON public.validacao_peca(avaliador_id);
CREATE INDEX IF NOT EXISTS idx_pecas_status_publicacao ON public.pecas(status_publicacao);
CREATE INDEX IF NOT EXISTS idx_faixas_preco_moeda ON public.faixas_preco(moeda);
CREATE INDEX IF NOT EXISTS idx_usuarios_tipo ON public.users(tipo_usuario);
