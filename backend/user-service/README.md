# user-service

Microserviço de usuários com CRUD usando **Node.js**, **Express** e **MySQL**.

## O que este projeto faz

Este serviço cadastra e gerencia usuários com os campos:

- e-mail
- senha
- nome completo
- gênero
- CEP

> O campo de cartão **não está neste serviço**. Em arquitetura de microsserviços, ele deve ficar em um `payment-service` separado.

## Estrutura

```bash
user-service/
├── docker-compose.yml
├── package.json
├── .env.example
├── sql/
│   └── init.sql
└── src/
    ├── app.js
    ├── server.js
    ├── config/
    │   └── db.js
    ├── controllers/
    │   └── userController.js
    ├── middlewares/
    │   ├── errorHandler.js
    │   ├── notFoundHandler.js
    │   └── validateRequest.js
    ├── repositories/
    │   └── userRepository.js
    ├── routes/
    │   └── userRoutes.js
    ├── services/
    │   └── userService.js
    ├── utils/
    │   └── ApiError.js
    └── validators/
        └── userValidator.js
```

## Como rodar

### 1. Suba o MySQL

```bash
docker compose up -d
```

### 2. Crie o banco e a tabela

Você pode usar o script abaixo:

```bash
sql/init.sql
```

### 3. Instale as dependências

```bash
npm install
```

### 4. Crie o arquivo `.env`

Copie o exemplo:

```bash
cp .env.example .env
```

### 5. Rode o projeto

```bash
npm run dev
```

Servidor:

```bash
http://localhost:3001
```

## Endpoints

### Health check

- `GET /health`

### Usuários

- `POST /users`
- `GET /users`
- `GET /users/:id`
- `PUT /users/:id`
- `PATCH /users/:id/password`
- `DELETE /users/:id`

## Exemplos de payload

### Criar usuário

```json
{
  "email": "bernardo@email.com",
  "password": "12345678",
  "full_name": "Bernardo Jakubiak",
  "gender": "Masculino",
  "cep": "87000-000"
}
```

### Atualizar usuário

```json
{
  "email": "bernardo.novo@email.com",
  "full_name": "Bernardo Jakubiak",
  "gender": "Masculino",
  "cep": "87010-120"
}
```

### Atualizar senha

```json
{
  "password": "novaSenha123"
}
```

## Observações

- a senha é armazenada com hash
- o retorno da API não expõe `password_hash`
- o CEP é validado em formato brasileiro
- o e-mail é único
