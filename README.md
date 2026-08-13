# BigPeças

Projeto BigPeças com frontend React e uma API Express unificada integrada ao Supabase.

## Estrutura

```text
backend/
├── src/
│   ├── config/
│   ├── middlewares/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── app.js
│   └── server.js
├── .env.example
├── Dockerfile
└── package.json

frontend/telaAuthSupabase/
```

O backend atende autenticação, peças, pedidos, favoritos e frete no mesmo processo, na porta `3001`.

## Rotas principais

- `/api/auth`: cadastro, perfil e validação da sessão.
- `/api/pecas`: consulta e manutenção de peças.
- `/api/pedidos`: criação e consulta de pedidos.
- `/api/pedidos/historico`: histórico separado de compras e vendas do usuário.
- `/api/wish`: favoritos.
- `/api/frete`: cálculo de frete.
- `/api/categorias` e `/api/materiais`: catálogos auxiliares.
- `/api/health`: verificação de saúde da API.

Com exceção dos endpoints públicos de autenticação e saúde, as rotas exigem um token Supabase no cabeçalho `Authorization: Bearer <token>`.

## Variáveis de ambiente

Copie `backend/.env.example` para `backend/.env` e preencha as credenciais:

```env
PORT=3001
FRONTEND_URL=http://localhost:5173
SUPABASE_URL=https://SEU_PROJETO.supabase.co
SUPABASE_ANON_KEY=SUA_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=SUA_SERVICE_ROLE_KEY
SUPABASE_USER_TABLE=users
SUPABASE_PECAS_TABLE=pecas
SUPABASE_CATEGORIAS_TABLE=categorias
SUPABASE_MATERIAIS_TABLE=materiais
```

A `SUPABASE_SERVICE_ROLE_KEY` deve existir somente no backend e nunca deve ser exposta ao frontend.

No frontend, use uma única URL base:

```env
VITE_API_URL=http://localhost:3001
```

As variáveis antigas `VITE_AUTH_API_URL` e `VITE_PECAS_API_URL` continuam aceitas temporariamente para compatibilidade.

## Execução local

Backend:

```bash
cd backend
npm install
npm run dev
```

Frontend:

```bash
cd frontend/telaAuthSupabase
npm install
npm run dev
```

## Docker Compose

Com `backend/.env` configurado:

```bash
docker compose up --build
```

A API ficará disponível em `http://localhost:3001` e o frontend em `http://localhost`.
