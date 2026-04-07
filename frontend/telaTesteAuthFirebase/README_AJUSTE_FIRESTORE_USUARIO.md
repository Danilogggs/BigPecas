# Ajuste do cadastro de usuário com Firebase Auth + Firestore

## O que foi corrigido
- Foi adicionada a rota `POST /api/auth/profile` no microserviço de autenticação para salvar o perfil do usuário no Firestore.
- Foi adicionada a rota `GET /api/auth/profile` para buscar o perfil salvo no Firestore.
- A rota `GET /api/auth/me` passou a tentar retornar também os dados do perfil, quando existirem.
- O frontend de cadastro de usuário passou a salvar o perfil usando o backend atualizado.
- O service de usuário foi ajustado para consumir corretamente as novas respostas do backend.

## Arquivos alterados

### `backend/microservice-authWithFirebase/src/routes/authRoutes.js`
- Inclusão das rotas de perfil no Firestore.
- Salvamento com base no `uid` do token autenticado.
- Validação amigável de nome e email.

### `backend/microservice-authWithFirebase/src/utils/errorMessages.js`
- Ampliação do tratamento para alguns erros comuns do Firebase/Firestore.

### `frontend/telaTesteAuthFirebase/src/services/usuarioService.js`
- Ajuste para lidar com as respostas de `/api/auth/profile`.
- Força renovação do token antes de chamar o backend.

### `frontend/telaTesteAuthFirebase/src/pages/CadastroUsuario.jsx`
- Mantido o cadastro no Firebase Auth.
- Ajustado o fluxo para salvar o perfil no Firestore logo após criar a conta.
- Melhoria das validações básicas do formulário.

## Como testar
1. Suba o microserviço `microservice-authWithFirebase`.
2. Suba o frontend `telaTesteAuthFirebase`.
3. Cadastre um novo usuário.
4. Verifique a coleção `users` no Firestore com um documento usando o `uid` do Firebase.
