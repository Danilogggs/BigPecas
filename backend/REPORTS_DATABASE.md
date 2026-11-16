# Relatorios e evidencias da rubrica de banco de dados

## Regras dos indicadores

- Faturamento = soma dos **produtos** dos pedidos atualmente `pago`, `enviado`
  ou `entregue`. Usa o preco/quantidade registrados em `pedidos.itens`, em BRL.
  Nao inclui frete nem rateia desconto; nao representa receita da plataforma.
- Vendas sao filtradas pela data do ultimo evento `pago` do historico. Pedidos
  legados sem esse evento usam `criado_em`, preservando o comportamento anterior.
- Pedidos, fluxo por status e taxas de conclusao/cancelamento usam `criado_em`.
  Esses indicadores operacionais podem ter uma quantidade diferente de vendas
  pagas no mesmo intervalo. O painel informa essa diferenca.
- Intervalos sao fechados no inicio e abertos no fim (`>= inicio`, `< fim`).
  O periodo e movel (7/30/90/365 dias); os grupos de calendario usam
  `America/Sao_Paulo`. Semanal inicia na segunda-feira. Dias sem vendas aparecem
  com zero. Todo o periodo nao possui comparacao anterior.
- Filtro por fornecedor seleciona somente os seus itens, sem atribuir a ele o
  valor inteiro de pedidos com varios vendedores. Cada pedido conta uma vez.
- Ticket medio = valor vendido / quantidade de pedidos pagos do mesmo recorte.
- Ranking de reputacao e global, apenas avaliacoes verificadas; atividade recente
  e global e limitada. Esses blocos nao acompanham o filtro financeiro.

## (a) Consultas agrupadas consumidas pela interface

Migration: `supabase/migrations/20261026204740_relatorios_agrupados.sql`.

| Funcao | Responsabilidade |
| --- | --- |
| `relatorio_pedidos_base` | Itens historicos por pedido, filtro de fornecedor e data de pagamento |
| `relatorio_metricas` | Somas, contagens e taxas dos periodos atual/anterior |
| `obter_dashboard_agrupado` | GROUP BY status, calendario, produto e fornecedor; serie com zeros |
| `obter_relatorio_vendedor` | Resumo global e pagina detalhada do vendedor autenticado |

`SupabaseAdminRepository` e `SupabasePedidosRepository` chamam RPCs. Controllers
nao contem SQL. O caso de uso valida os filtros e resolve o fornecedor pela
sessao; o cliente nao pode escolher outro vendedor no relatorio pessoal.
O navegador apenas formata resultados e desenha os graficos.

GET `/api/admin/analytics` aceita `days` (0,7,30,90,365), `status`,
`fornecedor_id` e `granularity` (diario,semanal,mensal). Retorna `metricas`,
`anteriores`, `status`, `serie`, `produtos`, `estoque`, `fornecedores`,
`pedidos`/`usuarios` recentes e `reputacao`.

GET `/api/pedidos/relatorio-vendas` aceita `days` (7,30,90) e `page` (>=1).
Mantem `days`, `sales`, `summary` e acrescenta `pagination` (50 por pagina).
O resumo considera o periodo inteiro, independentemente da pagina.
GET `/api/pedidos/relatorio-vendas/exportar` percorre lotes de 100 com o mesmo
intervalo; nao limita o Excel a primeira pagina. Detecta mudanca de quantidade
ou totais entre lotes e retorna 409 em vez de entregar um arquivo parcial.
Isso nao e um snapshot transacional duradouro: alteracoes concorrentes que
preservem exatamente os totais podem nao ser detectadas.

## (b) Indices reforcando regras de negocio

- Existentes: `wishlist(user_id,peca_id)` nao repete favorito;
  `vendas(pedido_id,item_indice)` nao duplica o registro financeiro;
  indices de avaliacoes impedem repetir uma avaliacao na mesma compra.
- Novo: `avaliacoes_pecas_uma_pendente_uidx`, unico parcial por `peca_id`
  onde `status='pendente'`, garante uma unica revisao aguardando decisao por anuncio.
  O trigger existente substitui a revisao pendente antes de inserir a nova.
- Novo: `pedidos_criado_em_idx` apoia a listagem limitada de atividade recente.

Nao criar indices equivalentes aos existentes nem apagar registros para fazer
uma migration passar. Antes de promover o indice parcial, conferir:

```sql
select peca_id, count(*)
from public.avaliacoes_pecas
where status = 'pendente'
group by peca_id having count(*) > 1;
```

## (c) Recursos especificos do PostgreSQL

As funcoes usam SQL/PLpgSQL, JSONB, LATERAL, agregacoes condicionais,
`generate_series` e datas com fuso horario. Sao `SECURITY INVOKER`, com
`search_path` fixo e EXECUTE revogado de PUBLIC/anon/authenticated. Apenas
`service_role` pode chama-las. A API continua responsavel pela autorizacao.

A funcao de aprovacao `decidir_avaliacao_peca` permanece como evidencia de
regra transacional: bloqueia registros com FOR UPDATE, decide a revisao,
atualiza a publicacao e insere a notificacao na mesma transacao.

## Validacao e aplicacao

```sh
npm test --prefix backend -- --runInBand
npm test --prefix frontend -- --runInBand
npm test --prefix scripts/devops
npm run build --prefix frontend
```

`scripts/devops/reports.test.cjs` executa PostgreSQL em memoria, com schema real
do bootstrap e dados ficticios: mais de mil pedidos, varios fornecedores, preco
historico, cancelamento, pagamento posterior a criacao, fuso, intervalo vazio,
paginacao, permissoes e violacoes de indices. Nao cria fixtures remotamente.

A migration foi validada e aplicada em **Bigpecas-Dev/Qas** e, com autorizacao
do usuario, em **BigPeças (producao)** em 26/10/2026. A verificacao previa nao
encontrou revisoes pendentes duplicadas. As consultas e permissoes foram
verificadas apos a aplicacao. Outros ambientes exigem verificacao do indice
parcial e aplicacao da migration antes de executar a nova versao da API.
Sem as funcoes, a API responde 503 e a interface mostra
uma mensagem de indisponibilidade, sem apresentar zeros como resultado valido.

O runner preserva a versao historica `20260914` sem renomear o arquivo e
remove seu BEGIN/COMMIT apenas da execucao, mantendo o checksum original.
Novas migrations continuam usando timestamp de 14 digitos.

Nao executar baseline indiscriminadamente num banco existente. Conferir as
migrations realmente aplicadas e aplicar somente as pendentes do ambiente.
Nenhum dado comercial e alterado por esta migration; ela cria funcoes de
leitura e indices. A criacao de indices pode bloquear escritas brevemente e
falha se houver revisoes pendentes duplicadas, preservando os dados.
