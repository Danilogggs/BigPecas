# Usuários, autenticação, perfil e administração

## Backend

Os módulos `usuarios` e `admin` seguem quatro limites explícitos:

- `domain`: normalização, validações e regras sem Express ou Supabase;
- `application`: casos de uso e autorização de cada operação;
- `infrastructure`: repositórios Supabase;
- `http`: tradução entre requisição/resposta e casos de uso.

`composition.js` é a raiz de composição e as rotas apenas associam verbos e caminhos aos controladores.

## Frontend

- `features/usuarios/domain` concentra máscaras e validação de perfil;
- `supabaseAuthGateway` encapsula autenticação externa;
- `perfilGateway` encapsula os endpoints do perfil;
- `AuthContext` mantém somente estado React e coordenação de sessão;
- `features/admin` separa regras dos widgets, acesso HTTP e estado da tela.

Foram aplicados Repository/Gateway, Dependency Injection, Provider, Use Case e Composition Root. O código de domínio pode ser testado sem navegador ou banco de dados.
