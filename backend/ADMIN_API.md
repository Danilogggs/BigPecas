# API administrativa do BigPecas

Todas as rotas abaixo exigem `Authorization: Bearer <access_token>`. O backend valida o token no
Supabase Auth e, em seguida, consulta `users.is_admin`. Um valor vindo do frontend ou dos metadados
do token nunca concede acesso.

## Instalacao

1. Execute `supabase/migrations/20260820_administradores.sql` no SQL Editor do Supabase.
2. Crie o primeiro administrador pelo SQL Editor (troque o email):

```sql
update public.users
set is_admin = true
where lower(email) = lower('admin@bigpecas.com');
```

Depois disso, administradores podem promover outros usuarios por `PATCH /api/admin/usuarios/:id/admin`.
O backend impede a remocao do ultimo administrador.

## Rotas

| Metodo | Rota | Finalidade |
| --- | --- | --- |
| GET | `/api/admin/me` | Confirma o perfil administrativo atual. |
| GET | `/api/admin/dashboard` | Totais de usuarios, pecas, pedidos e avaliacoes. |
| GET | `/api/admin/preferencias` | Carrega os widgets salvos do administrador. |
| PUT | `/api/admin/preferencias` | Salva ordem e visibilidade com `{ "widgets": [...] }`. |
| GET | `/api/admin/usuarios?page=1&limit=20&search=` | Lista e pesquisa usuarios. |
| PATCH | `/api/admin/usuarios/:id/admin` | Promove/rebaixa com `{ "is_admin": true }`. |
| GET | `/api/admin/pecas?page=1&limit=20&search=` | Lista pecas para moderacao. |
| DELETE | `/api/admin/pecas/:id` | Remove uma peca inadequada. |
| GET | `/api/admin/pedidos?page=1&limit=20&status=` | Lista e filtra pedidos. |
| PATCH | `/api/admin/pedidos/:id/status` | Corrige status com `{ "status": "pago" }`. |
| GET | `/api/admin/avaliacoes/produtos` | Lista avaliacoes de produtos. |
| GET | `/api/admin/avaliacoes/fornecedores` | Lista avaliacoes de fornecedores. |
| DELETE | `/api/admin/avaliacoes/:tipo/:id` | Remove avaliacao abusiva/fraudulenta. |

Listagens aceitam no maximo 100 registros por pagina. Os status aceitos sao
`aguardando_pagamento`, `pago`, `enviado`, `entregue` e `cancelado`.

O endpoint normal `GET /api/auth/me` agora devolve `profile.is_admin`, para o frontend decidir se
mostra o link do painel. Isso serve apenas para interface; a seguranca permanece no backend.
