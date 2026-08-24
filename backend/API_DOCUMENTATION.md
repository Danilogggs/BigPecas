# BigPecas Backend API

Esta pagina e o indice principal dos servicos REST do backend.

## Documentacao completa

- [`README.md`](./README.md): visao geral do backend, requisitos, instalacao, variaveis de ambiente, banco de dados e execucao do projeto.
- [`openapi.yaml`](./openapi.yaml): especificacao OpenAPI 3.0.3 com todos os servicos, descricoes e exemplos reais de payload.

## Como visualizar a API

1. Abra <https://editor.swagger.io/>.
2. Importe ou cole o conteudo de [`openapi.yaml`](./openapi.yaml).
3. Use o sumario lateral do Swagger para navegar por todos os grupos de rotas.

Tambem e possivel publicar o mesmo arquivo em Swagger UI, Redoc, GitHub Wiki ou GitHub Pages. A forma mais simples e segura para este projeto e manter a documentacao versionada no proprio repositorio.

## Servicos documentados

| Grupo | Descricao |
| --- | --- |
| Health | Verificacoes de disponibilidade da API. |
| Auth | Cadastro, perfil e usuario autenticado via Supabase Auth. |
| Catalogo | Categorias e materiais usados no catalogo. |
| Pecas | Cadastro, listagem, busca, edicao, remocao e recomendacoes. |
| Wishlist | Lista de desejos do usuario autenticado. |
| Pedidos | Criacao, consulta, historico e atualizacao de status. |
| Notificacoes | Contador, listagem e marcacao de notificacoes como lidas. |
| Avaliacoes | Avaliacoes verificadas de fornecedores e produtos. |
| Frete | Calculo de frete e renovacao de token do Melhor Envio. |
| Admin | Dashboard, preferencias, usuarios, pecas, pedidos e avaliacoes administrativas. |

## Observacao

O arquivo antigo documentava apenas `/api/pecas`. Ele foi substituido por este indice para evitar divergencia com a API real.
