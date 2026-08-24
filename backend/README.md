# BigPecas Backend

API REST do BigPecas, responsavel por autenticacao, perfis, catalogo de pecas, pedidos, vendas, frete, notificacoes, avaliacoes, favoritos e administracao da plataforma.

## Sumario

- [Visao geral](#visao-geral)
- [Tecnologias](#tecnologias)
- [Documentacao da API](#documentacao-da-api)
- [Requisitos](#requisitos)
- [Configuracao do ambiente](#configuracao-do-ambiente)
- [Instalacao](#instalacao)
- [Execucao](#execucao)
- [Testes](#testes)
- [Autenticacao](#autenticacao)
- [Servicos do backend](#servicos-do-backend)
- [Variaveis de ambiente](#variaveis-de-ambiente)
- [Banco de dados](#banco-de-dados)
- [E-mails e notificacoes](#e-mails-e-notificacoes)
- [Frete](#frete)
- [Erros e seguranca](#erros-e-seguranca)

## Visao geral

O backend centraliza as regras da aplicacao BigPecas:

- cadastro, login e sincronizacao de perfil com Supabase Auth;
- CRUD de pecas com validacao de fornecedor;
- catalogo com categorias, materiais, filtros, recomendacoes e perfis de vendedores;
- criacao de pedidos, historico de compras/vendas e transicoes de status;
- sincronizacao de vendas por item do pedido;
- envio de e-mails para vendedores e clientes;
- gravacao e leitura de notificacoes do usuario;
- calculo de frete via Melhor Envio;
- wishlist;
- avaliacoes pos-compra de produtos e fornecedores;
- painel administrativo com indicadores, moderacao e preferencias.

## Tecnologias

- Node.js
- Express
- Supabase JS
- Supabase Auth
- Supabase Postgres
- Melhor Envio
- Resend ou Mailgun para e-mails
- Jest e Supertest para testes
- Helmet, CORS e rate limiting

## Documentacao da API

A especificacao completa esta em:

- [`openapi.yaml`](./openapi.yaml)

Esse arquivo cumpre a documentacao tecnica dos servicos e pode ser aberto em:

- Swagger Editor: <https://editor.swagger.io/>
- Swagger UI: usar o arquivo `backend/openapi.yaml`
- Redoc: <https://redocly.github.io/redoc/>

Forma recomendada para entrega academica: manter `backend/README.md` e `backend/openapi.yaml` no repositorio. Isso garante versionamento junto do codigo e atende a rubrica sem depender de plataforma externa. Se quiser publicar depois, a melhor opcao simples e GitHub Wiki ou GitHub Pages com Swagger UI/Redoc apontando para o `openapi.yaml`.

## Requisitos

- Node.js 20 ou superior
- npm
- Projeto Supabase configurado
- Tabelas esperadas no Supabase
- Credenciais do Melhor Envio, se o calculo de frete for usado
- Credenciais Resend ou Mailgun, se o envio real de e-mail for usado

## Configuracao do ambiente

1. Entre na pasta do backend:

```bash
cd backend
```

2. Crie o arquivo `.env` a partir do exemplo:

```bash
cp .env.example .env
```

No Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

3. Preencha as variaveis do Supabase, Melhor Envio e e-mail conforme o ambiente.

## Instalacao

```bash
cd backend
npm install
```

## Execucao

Ambiente de desenvolvimento:

```bash
npm run dev
```

Ambiente de producao/local simples:

```bash
npm start
```

Por padrao, a API sobe em:

```text
http://localhost:3001
```

Health checks:

```text
GET /
GET /api/health
GET /api/auth/health
```

## Testes

Executar todos os testes:

```bash
npm test
```

Executar em modo watch:

```bash
npm run test:watch
```

Gerar cobertura:

```bash
npm run test:coverage
```

## Autenticacao

As rotas protegidas usam Supabase Auth. O frontend envia o token de sessao no header:

```http
Authorization: Bearer <access_token>
```

O middleware `verifyToken` valida o token via Supabase e injeta o usuario autenticado em `req.user`.

Rotas publicas:

- `GET /`
- `GET /api/health`
- `GET /api/auth/health`
- `POST /api/auth/register`

As demais rotas de negocio exigem autenticacao. Rotas de administrador tambem exigem `users.is_admin = true`.

## Servicos do backend

Todos os endpoints, parametros e exemplos estao detalhados no `openapi.yaml`.

Resumo dos grupos:

| Grupo | Base path | Finalidade |
| --- | --- | --- |
| Auth | `/api/auth` | Cadastro, sessao, perfil e consulta de usuarios |
| Catalogo | `/api` | Categorias e materiais |
| Pecas | `/api/pecas` | Cadastro, busca, edicao, remocao e recomendacoes |
| Wishlist | `/api/wish` | Lista de desejos do usuario |
| Pedidos | `/api/pedidos` | Compras, vendas, criacao de pedido e status |
| Notificacoes | `/api/notificacoes` | Lista, contagem e leitura de notificacoes |
| Avaliacoes | `/api/avaliacoes` | Avaliacoes pos-compra de produtos e fornecedores |
| Frete | `/api/frete` | Calculo e refresh de token do Melhor Envio |
| Admin | `/api/admin` | Painel, usuarios, pecas, pedidos e avaliacoes |

## Variaveis de ambiente

As variaveis aceitas estao documentadas em `.env.example`.

Principais:

| Variavel | Obrigatoria | Descricao |
| --- | --- | --- |
| `PORT` | Nao | Porta da API. Padrao: `3001` |
| `FRONTEND_URL` | Sim | Origem permitida no CORS |
| `SUPABASE_URL` | Sim | URL do projeto Supabase |
| `SUPABASE_ANON_KEY` | Sim para cadastro | Chave publica usada no registro via Auth |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | Chave de service role usada pelo backend |
| `SUPABASE_*_TABLE` | Nao | Permite customizar nomes de tabelas |
| `MELHOR_ENVIO_*` | Para frete | Credenciais e tokens do Melhor Envio |
| `RESEND_API_KEY` | Para e-mail | Token Resend |
| `MAILGUN_API_KEY` | Para e-mail | Token Mailgun |
| `EMAIL_NOTIFICACAO_VENDA_ENABLED` | Nao | Liga/desliga notificacoes por e-mail |

## Banco de dados

O backend espera tabelas Supabase para:

- `users`
- `pecas`
- `categorias`
- `materiais`
- `pedidos`
- `vendas`
- `wishlist`
- `notificacoes`
- `avaliacoes_fornecedor`
- `avaliacoes_produto`
- `admin_dashboard_preferences`

Migrations existentes:

- `supabase/migrations/20260813_avaliacoes_pos_compra.sql`
- `supabase/migrations/20260820_administradores.sql`
- `supabase/migrations/20260820_admin_dashboard_preferences.sql`

Tabela simples de notificacoes usada pelo projeto:

```sql
create table if not exists public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  pedido_id text null,
  tipo text not null,
  titulo text not null,
  mensagem text not null,
  status_envio text not null default 'pendente',
  lida_em timestamptz null,
  criada_em timestamptz not null default now()
);
```

## E-mails e notificacoes

O servico `emailService` envia:

- e-mail para vendedores quando uma venda e confirmada;
- e-mail para clientes quando o status do pedido muda;
- registro na tabela `notificacoes` para exibir no sino do frontend.

O envio usa Resend quando `RESEND_API_KEY` existe. Caso contrario, tenta Mailgun quando `MAILGUN_API_KEY` e `MAILGUN_DOMAIN` existem.

Guia especifico de teste:

- [`EMAIL_TESTING.md`](./EMAIL_TESTING.md)

## Frete

O calculo de frete usa Melhor Envio:

- `POST /api/frete/calcular`
- `POST /api/frete/refresh`

O backend renova token automaticamente se a API responder `401`, usando `MELHOR_ENVIO_REFRESH_TOKEN`.

## Erros e seguranca

- `helmet` ativa headers de seguranca HTTP.
- `cors` restringe origem pelo `FRONTEND_URL`.
- `express-rate-limit` protege a API.
- `errorHandler` padroniza respostas de erro.
- `verifyToken` protege rotas autenticadas.
- `verifyAdmin` restringe `/api/admin`.

Formato comum de erro:

```json
{
  "error": "Mensagem amigavel para o usuario"
}
```
