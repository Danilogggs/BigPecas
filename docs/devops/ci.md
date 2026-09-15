# Integracao continua do BigPecas

## Primeira etapa: build e testes

O workflow `.github/workflows/ci.yml` verifica pull requests destinados a `develop`,
execucoes manuais e chamadas reutilizaveis da release. Nos pushes de `develop` e
`main`, a release chama essa CI uma unica vez antes do deploy, evitando duas runs
iguais. A PR automatica de `develop` para `main` nao repete a CI: o commit ja foi
validado antes da promocao e a release da `main` executa a mesma CI novamente antes
de prod. Os jobs de backend, frontend e build rodam
independentemente, permitindo visualizar todos os resultados mesmo quando um falha.

Esta etapa nao cria recursos Azure, nao faz deploy e nao executa migrations.
Os testes usam mocks e configuracoes ficticias do Supabase, sem necessidade de
Secrets. Nao cadastrar credenciais de producao nesta pipeline de verificacao.

O frontend gera um artefato de verificacao com URLs ficticias. Esse artefato
nao e uma versao pronta para publicar: o deploy futuro precisara de build com
as configuracoes publicas corretas do ambiente. Service-role nunca vai ao frontend.

## Executar localmente

Utilize a versao mais recente do Node 22 (no minimo 22.18.0, devido ao Babel 8).
A pipeline resolve o Node 22 pela `.nvmrc`, sem depender da versao instalada
nos computadores da equipe.

```sh
npm ci --prefix backend
npm ci --prefix frontend
npm run test:ci --prefix backend
npm run test:review --prefix backend
npm run test:ci --prefix frontend
npm run build --prefix frontend
```

Os scripts de CI executam Jest em um unico processo e mantem os limites de
cobertura existentes. Falhas nos testes ou nos limites resultam em codigo de
saida diferente de zero. Nao ha `continue-on-error`, exclusao de suites ou
reducao dos limites para aprovar a pipeline.

## Ativar para a equipe e guardar evidencias

1. Publicar os arquivos em uma branch e abrir um pull request.
2. Verificar a execucao `CI BigPecas` na aba Actions do GitHub.
3. Consultar os jobs `Tests (backend)`, `Tests (frontend)` e `Build frontend`.
4. Baixar os artefatos de testes: incluem `test-results.json` e cobertura LCOV/HTML.
5. Registrar o link da execucao, commit, data e resultado na tarefa da sprint.
6. Apos a primeira execucao remota aprovada, configurar esses checks como obrigatorios
   nas regras da `main`, junto com a revisao por pull request.

Artifacts ficam disponiveis por 14 dias; salvar as evidencias necessarias para
a avaliacao antes de expirarem. A configuracao de branch protection requer
permissao no repositorio e nao e aplicada simplesmente adicionando este YAML.

## Diagnostico inicial em 13/09/2026

Resultados locais anteriores a qualquer correcao das suites:

| Verificacao | Resultado |
| --- | --- |
| Build Vite | Aprovado; aviso de bundle acima de 500 kB |
| Regressao backend | 9 testes aprovados |
| Jest backend | 426 aprovados e 44 reprovados; 3 suites com falhas |
| Cobertura backend | 84,82% das linhas; 65,64% das ramificacoes, abaixo do limite de 70% |
| Jest frontend | 437 testes aprovados, em 28 suites |
| Cobertura frontend | 29,45% das linhas no total; limites de services e contexts nao atendidos |

## Validacao apos as correcoes em 13/09/2026

As fixtures de `pedidosRoutes`, `pecasRoutes` e `adminRoutes` foram atualizadas
para refletir precos por moeda, consulta ao catalogo publicado, aprovacao de
anuncios e enriquecimento das avaliacoes. Foram acrescentados testes de
conversao, validacao de checklist e permissao de avaliador no backend, e de
moeda, idioma, tema personalizado, configuracao Supabase, avaliacao e falhas
de requisicoes no frontend. Nenhum limite de cobertura foi reduzido.

| Verificacao | Resultado local final |
| --- | --- |
| Jest backend | 511 testes aprovados em 24 suites |
| Cobertura backend | 90,90% das linhas; 72,69% das ramificacoes; todos os limites atendidos |
| Regressao backend | 9 testes aprovados |
| Jest frontend | 478 testes aprovados em 34 suites; todos os limites por camada atendidos |
| Frontend services | 98,17% das linhas; 96,12% das ramificacoes |
| Frontend contexts | 100% das linhas; 89,78% das ramificacoes |
| Build Vite | Aprovado; permanece aviso de bundle principal acima de 500 kB |

A cobertura global de linhas do frontend e 32,17%: as telas e componentes
ainda precisam de testes adicionais. A aprovacao corresponde aos limites
existentes por camada, nao a cobertura completa da interface ou a testes E2E.

Os resultados foram obtidos no Windows com Node 22.15.0 (abaixo da versao
suportada pelo Babel); a execucao em Linux/Node atualizado ainda precisa ser
comprovada no GitHub. Nao constituem evidencia de uma pipeline ja executada.

## Proximas etapas

A preparacao de IaC, deploy por ambiente e monitoramento foi adicionada
posteriormente. Consulte [azure.md](azure.md) para escopo, bloqueios e ativacao.
O workflow de release permanece desabilitado ate a configuracao externa.
O novo job `Validate infrastructure` compila Bicep, testa os bloqueios de deploy
e constroi as imagens Docker sem publica-las.

- Publicar a branch, abrir PR e comprovar a primeira execucao remota da CI.
- Ampliar os testes de telas e os testes de ponta a ponta.
- Definir e provisionar a infraestrutura Azure por IaC.
- Configurar autenticacao Azure/GitHub e adicionar deploy do primeiro ambiente.
- Adicionar observabilidade e guardar evidencias do seu uso.
- Evoluir para dev/test/prod com isolamento e promocao de versoes.

Esta entrega prepara a CI. Nao comprova CI/CD completo nem provisionamento
na nuvem. A evidencia de execucao do build na pipeline pode apoiar o nivel
inicial da rubrica, sujeito a avaliacao do professor.
