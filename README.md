# BigPeças

Projeto BigPeças com autenticação migrada para Supabase.

## Autenticação

A autenticação usa Supabase Auth para cadastro, login, logout, sessão e recuperação de senha.

O backend de autenticação fica em:

```txt
backend/microservice-authWithSupabase
```

O front-end principal fica em:

```txt
frontend/telaAuthSupabase
```

## Tabela de usuários

A tabela pública usada pelo backend é `users`. Os campos esperados são:

```txt
id
email
password_hash
full_name
gender
cep
tipo_usuario
nome_loja
descricao_loja
telefone
created_at
updated_at
```

A coluna `password_hash` não é preenchida pelo projeto, porque a senha fica armazenada no Supabase Auth. Essa coluna precisa aceitar `NULL`.

## Variáveis de ambiente

Backend:

```env
PORT=3001
FRONTEND_URL=http://localhost:5173
SUPABASE_URL=https://SEU_PROJETO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=SUA_SERVICE_ROLE_KEY
SUPABASE_USER_TABLE=users
```

Front-end:

```env
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_SUPABASE_ANON_KEY
VITE_AUTH_API_URL=http://localhost:3001
VITE_PECAS_API_URL=http://localhost:3002/api
VITE_USER_SERVICE_URL=http://localhost:3002
```

## Como rodar

Backend de autenticação:

```bash
cd backend/microservice-authWithSupabase
npm install
npm run dev
```

Front-end:

```bash
cd frontend/telaAuthSupabase
npm install
npm run dev
```
