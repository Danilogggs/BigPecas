# Migrations do BigPecas

O schema do banco e versionado neste diretorio. Toda mudanca estrutural entra
como uma migration nova; nada de alterar tabela pelo editor visual do Supabase.

## Convencoes

- Um arquivo por mudanca, nomeado `<YYYYMMDDHHMMSS>_<nome_em_snake_case>.sql`
  (timestamp UTC de 14 digitos, formato do Supabase CLI). O runner recusa
  qualquer arquivo fora desse padrao.
- **Nao escreva `begin`/`commit`**: o runner abre uma transacao por migration.
  Se a migration falhar, nada dela fica aplicado pela metade.
- Prefira comandos idempotentes (`if not exists`, `if exists`,
  `add column if not exists`), para que um reenvio acidental nao quebre.
- **Migration aplicada nao se edita.** Corrija criando outra. Editar um arquivo
  ja aplicado faz o `checksum` divergir e o runner passa a avisar em todo
  `migrate:status`.
- Terminando com DDL que o PostgREST precisa enxergar, feche com
  `notify pgrst, 'reload schema';`.

## Comandos

Rode a partir de `backend/`, com `SUPABASE_DB_URL` no `.env`:

```bash
npm run migrate:status            # o que ja foi aplicado e o que falta
npm run migrate                   # aplica as pendentes, em ordem
npm run migrate:create -- nome    # cria o arquivo ja com timestamp correto
npm run migrate:baseline          # registra como aplicadas SEM executar
```

Quem tiver o [Supabase CLI](https://supabase.com/docs/guides/cli) instalado
pode usar o fluxo oficial, que le o mesmo `config.toml` e a mesma tabela de
controle:

```bash
supabase link --project-ref <ref>
supabase db push                  # equivalente a npm run migrate
supabase db reset                 # recria o banco local do zero
```

Os dois caminhos gravam em `supabase_migrations.schema_migrations`, entao usar
um nao faz o outro reaplicar migration nenhuma. O runner so acrescenta ali uma
coluna `checksum`, anulavel, que o CLI ignora.

## Banco novo

```bash
npm install
npm run migrate
```

A primeira migration (`20260101000000_baseline_schema.sql`) cria o schema base
completo, com as tabelas ja na ordem correta de dependencia.

## Banco que ja existe (producao atual)

O banco de producao recebeu esses scripts manualmente pelo SQL Editor, antes de
existir controle de versao. Ele ja tem as tabelas, mas nao tem a tabela de
controle — entao **registre o estado atual uma unica vez**, sem reexecutar:

```bash
npm run migrate:status      # deve listar tudo como [pendente]
npm run migrate:baseline    # marca como aplicadas, sem rodar o SQL
npm run migrate:status      # agora tudo [ok]
```

Depois disso, `npm run migrate` aplica so o que for novo.

> Rodar `npm run migrate` direto num banco existente, sem o baseline, tambem
> nao destroi dados — as migrations sao idempotentes — mas o baseline e o
> caminho correto e mais rapido.

## Historico

| Migration | O que faz |
|---|---|
| `20260101000000_baseline_schema` | Schema base: users, pecas, pedidos, vendas, catalogos, wishlist, notificacoes e afins |
| `20260801000000_rascunho_avaliador_substituido` | Marcador vazio do antigo `001`, substituido pela migration de avaliacao/moeda |
| `20260813000000_avaliacoes_pos_compra` | Liga vendas/avaliacoes ao pedido e cria `avaliacoes_produto` |
| `20260820000000_administradores` | `users.is_admin` e trigger que impede elevacao de privilegio |
| `20260820000100_admin_dashboard_preferences` | Preferencias de widgets do painel admin |
| `20260830000000_avaliacao_moeda_segura` | Fila de avaliacao de pecas, `taxas_cambio`, preco/moeda base, RLS e view publica |
| `20260831000000_exclusao_permanente_admin` | Funcoes de exclusao permanente de peca e usuario |

## DATABASE_SCHEMA_UPDATED.sql

Referencia legada, mantida so para consulta. Nao e executavel (tabelas fora da
ordem de dependencia) e nao acompanha mais o banco. A fonte da verdade e
`migrations/`.
