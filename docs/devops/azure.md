# Azure: preparacao de IaC, deploy e observabilidade

## Estado desta entrega

Arquivos preparados localmente. Nenhum recurso criado, identidade autorizada,
secret cadastrado, commit publicado ou deploy executado. `CD_ENABLED` ausente
ou diferente de `true` bloqueia a release. Nao ativar antes de concluir este guia.
Compilar Bicep nao comprova permissao, quota, disponibilidade regional ou deploy.

Validacao local em 13/09/2026: Bicep 0.47.16 compilou os tres templates;
actionlint 1.7.12 aprovou os workflows; Bash aprovou a sintaxe do bootstrap;
514 testes Jest backend, 478 frontend, 9 regressoes backend e 12 testes dos
bloqueios de deploy passaram, mantendo os limites de cobertura. O build Docker
nao foi executado localmente porque o mecanismo Docker Desktop estava
indisponivel; essa verificacao esta incluida na CI e ainda precisa rodar no GitHub.

## Arquitetura proposta (sujeita a aprovacao de custo)

Cada ambiente dev/test/prod tem seu proprio grupo `rg-bigpecas-<ambiente>`:

- Duas Azure Container Apps: frontend Nginx e backend Node 22, HTTPS externo.
- Um Container Apps Environment Consumption, sem VM administrada pela equipe.
- Um ACR Basic privado, administrador desativado e leitura por identidade gerenciada.
- Um Log Analytics com retencao de 30 dias e cota de ingestao de 0,1 GB/dia.
- Um workbook com requisicoes, erros e latencia p95; metricas nativas de CPU,
  memoria e replicas disponiveis nas Container Apps.
- Uma regra de alerta de erros do backend e um grupo de acao com email.
- Identidades separadas para deploy e leitura de imagens. Nenhuma senha Azure.

Aplicacoes usam 0,25 vCPU e 0,5 GiB cada, minimo 0 e maximo 1 replica.
Escala zero pode causar demora na primeira requisicao. Uma replica e uma
configuracao de demonstracao, nao alta disponibilidade de producao. O rate limit
em memoria nao e distribuido: nao aumentar replicas sem rever essa arquitetura.
TRUST_PROXY=1 assume o ingresso direto do Container Apps, sem CDN intermediaria;
validar o IP real e o bloqueio de cabecalhos forjados antes de liberar usuarios.

### Custos: nao ha promessa de gratuidade

Antes de provisionar, preencher na calculadora Azure a regiao permitida pela
assinatura e os recursos acima. Ha **tres ACR Basic com custo recorrente**, mesmo
com apps paradas, alem de logs, alertas e possiveis custos de trafego/execucao.
Os recursos antigos continuam sendo cobrados; este projeto nao os exclui.

Como referencia de dimensionamento, seis apps ativas 24h por 30 dias consumiriam
3.888.000 vCPU-segundos e 7.776.000 GiB-segundos, antes de franquias e ajustes de
cobranca. Com escala zero o consumo depende do uso. As franquias Consumption
sao compartilhadas pela assinatura, nao multiplicadas por ambiente.
O limite configurado de logs soma aproximadamente 9 GB/30 dias nos tres ambientes;
a cota diaria nao e um teto financeiro rigido e pode interromper coleta/alertas.
Confirmar precos em moeda local e saldo de creditos antes de autorizar a primeira
release. Configurar um orcamento no Azure com notificacoes de 50%, 80% e 100%
do valor escolhido pelo responsavel. Orcamento alerta, nao desliga recursos.

- [Calculadora Azure](https://azure.microsoft.com/pricing/calculator/)
- [Cobranca Container Apps](https://learn.microsoft.com/en-us/azure/container-apps/billing)
- [Precos Container Apps](https://azure.microsoft.com/en-us/pricing/details/container-apps/)
- [Precos Azure Monitor](https://azure.microsoft.com/en-us/pricing/details/monitor/)
- [Precos ACR](https://azure.microsoft.com/en-us/pricing/details/container-registry/)

## Supabase: dois projetos, producao protegida

Decisao aprovada: preservar o projeto BigPecas existente para producao e criar
um segundo projeto, Bigpecas-Dev/Qas, para desenvolvimento e testes. As aplicacoes Azure continuam
separadas em dev/test/prod, mas dev e test compartilham banco, Auth e Storage
do projeto de testes. Nao ha isolamento de dados entre dev e test; alteracoes
em um podem afetar o outro. Coordenar testes/migrations com a equipe. Essa
arquitetura nao deve ser apresentada como tres ambientes totalmente isolados.

O script exige TEST_SUPABASE_URL diferente de PROD_SUPABASE_URL, exige que
dev/test apontem para teste e que prod aponte para producao. DEV_SUPABASE_URL
nao e mais utilizada e deve ser removida se ja foi cadastrada. Isso nao valida
os conteudos do banco nem substitui a revisao manual das credenciais.

O bootstrap do projeto Dev/Qas novo esta documentado em
[DEVQAS.md](../../backend/supabase/DEVQAS.md), com SQL localmente validado e
bloqueio de execucao em banco ja inicializado.

Nao criar projetos pagos automaticamente. Confirmar limites/plano na conta.
Nao copiar dados pessoais de producao para teste. Aplicar o schema e migrations
de `backend/supabase` em banco de teste vazio e conferir ordem, dependencias,
RLS, Storage, Realtime e funcoes antes de repetir em outro projeto. Os arquivos
existentes nao sao tratados como uma migration automatica ja validada.

O Azure deploy **nao executa SQL ou seeds**. INITIALIZE_DATABASE_DATA=false
impede a carga automatica de categorias/materiais no startup em nuvem. Os dados
de referencia precisam ser inseridos explicitamente no ambiente correto.
Os projetos/configuracoes Supabase ainda sao externos ao IaC Azure desta entrega;
portanto nao declarar a infraestrutura de todo o sistema 100% automatizada.

## O que o responsavel precisa fazer (em ordem)

### 1. Decisoes antes de qualquer criacao

Confirmar regiao permitida, estimativa/orcamento, email para alertas e separacao
dos dois projetos Supabase. Revisar os arquivos e publicar uma branch/PR.
Nao ativar CD ainda. A CI do PR deve ficar verde no GitHub (inclusive Bicep/Docker).

### 2. Configurar GitHub Environments

Em Settings > Environments, criar `dev`, `test`, `prod`. Restringir deployments
a branch `develop` em `dev` e `test`, e `main` em `prod`; exigir revisor em `test` e `prod`, de preferencia outro
membro da equipe. A exigencia de revisor e uma configuracao do GitHub, nao do YAML.
Proteger develop e main com PR/revisao e checks CI aprovados; nao permitir pushes diretos.
Funcionalidades entram por PR na develop; apos homologacao em test, abrir PR
de develop para main. Nao criar uma branch qas separada: test e o ambiente de QAS.

Variaveis de repositorio:

| Nome | Valor |
| --- | --- |
| AZURE_SUBSCRIPTION_ID | ID confirmado no Cloud Shell |
| AZURE_TENANT_ID | ID confirmado no Cloud Shell |
| TEST_SUPABASE_URL | URL do projeto de testes, compartilhado por dev/test |
| PROD_SUPABASE_URL | URL do projeto de producao |
| CD_ENABLED | Manter `false` ate finalizar configuracao e aprovar custos |

Em **cada Environment**:

| Tipo | Nome | Finalidade |
| --- | --- | --- |
| Variable | AZURE_CLIENT_ID | Saida do bootstrap daquele ambiente |
| Variable | SUPABASE_URL | URL correspondente da lista aprovada |
| Variable | ALERT_EMAIL | Email real do responsavel pelos incidentes |
| Variable opcional | MIN_REPLICAS | 0 por padrao; 1 aumenta consumo ocioso |
| Variable opcional | MELHOR_ENVIO_URL | Sandbox por padrao; producao somente em prod |
| Secret | SUPABASE_ANON_KEY | Chave publica anon do projeto correto |
| Secret | SUPABASE_SERVICE_ROLE_KEY | Chave privilegiada, somente no backend |
| Secret opcional | MELHOR_ENVIO_ACCESS_TOKEN | Necessario para cotacao real pelo servico |

A chave anon sera incorporada ao frontend, como esperado; RLS deve proteger
os dados. Nos Environments dev e test, cadastrar a mesma URL e as chaves do
projeto de testes; no Environment prod, somente as do projeto de producao.
No Supabase de testes, autorizar os redirects dos dois frontends dev/test;
no de producao, autorizar apenas os do frontend prod.
Nunca colocar service-role em variavel VITE. Nao enviar chaves no chat.
Email de notificacao de vendas fica desativado ate configurar um provedor e
validar o fluxo. Recuperacao/confirmacao de senha continua usando Supabase Auth
e requer SMTP e redirect URLs adequados em cada projeto.

### 3. Bootstrap de acesso no Azure (acao manual autorizada)

Somente depois de os arquivos estarem publicados, abrir Cloud Shell Bash e
clonar o repositorio/checkout do commit revisado. Nao usar instrucoes de branch
nao revisada. Executar a partir da raiz, substituindo REGIAO pela aprovada:

```bash
bash scripts/devops/bootstrap.sh dev REGIAO
bash scripts/devops/bootstrap.sh test REGIAO
bash scripts/devops/bootstrap.sh prod REGIAO
```

O script exibe assinatura, pede confirmacao, registra providers e apresenta
what-if antes de criar grupos e identidades. Permissao de Proprietario permite
o bootstrap, mas politicas institucionais podem impedir operacoes. Ele nao
cria Container Apps, ACR ou logs; esses recursos so aparecem na release.

Guardar clientId de cada saida como AZURE_CLIENT_ID do Environment respectivo.
O bootstrap e IaC versionado executado uma vez pelo responsavel; a pipeline
nao tem permissao para conceder papeis a si mesma. Deploy recebe Contributor
e AcrPush somente no grupo dedicado, e pull recebe apenas AcrPull nesse grupo.
A federacao autoriza exatamente `repo:Danilogggs/BigPecas:environment:<ambiente>`.

### 4. Ativar e acompanhar a primeira release

Depois de aprovar custos, concluir banco, variaveis, secrets e protecoes, definir
CD_ENABLED=true. Executar `Release Azure por branch` pela develop: CI -> dev ->
test (QAS). Uma falha impede o proximo ambiente. Apos homologar, abrir PR para
main; o merge executa novamente CI -> prod, com aprovacao do Environment prod.
Pushes nas duas branches tambem disparam seus respectivos fluxos. Execucao
manual de outras branches nao implanta recursos. Manter as restricoes dos
Environments: o YAML nao configura revisores nem protecao de branches.

Dev e test recebem o mesmo commit de develop. Main pode gerar um novo commit
de merge, que passa novamente pela CI; a aprovacao de prod deve conferir o PR
e a evidencia de homologacao. Nao ha verificacao automatica dessa evidencia.
O frontend e reconstruido com
configuracao publica por ambiente (nao e o mesmo binario). Imagens privadas sao
implantadas por digest SHA256, registrado em artefato. Bases Node/Nginx usam
tags atualizaveis; para reproducao binaria estrita, fixar tambem seus digests.

Planejamento what-if antecede cada aplicacao de Bicep. Os planos mostram IDs,
nao os valores de secrets. Os parametros sensiveis ficam em arquivo temporario
com permissao restrita no runner, nao em artefatos, e sao removidos ao terminar.
Nao habilitar debug/tracing de comandos com secrets. O modo de deploy e
incremental: recursos removidos do Bicep nao sao apagados automaticamente.

Na primeira implantacao, a pipeline cria os Container Apps com uma imagem publica
de inicializacao para o Azure concluir a associacao da identidade gerenciada.
Em seguida aplica o estado final com as imagens privadas por digest. Essa etapa
e condicional: execucoes posteriores nao substituem temporariamente uma aplicacao
ja existente. Ela contorna a validacao antecipada do ACR pelo Container Apps.

Na primeira execucao, registrar as URLs mostradas no job e adicionar no Supabase:
Site URL do frontend e redirects `/login?emailConfirmado=1` e `/redefinir-senha`.
Testar manualmente cadastro, confirmacao, login, recuperacao, catalogo e pedidos
com dados ficticios em dev/test. Smoke HTTP nao comprova esses fluxos: a rota
health verifica apenas o processo HTTP e nao realiza consulta ao banco.

### Docker local

Os contextos Docker agora excluem `.env` e dependencias locais. Para executar
o Compose, passar explicitamente as configuracoes publicas de build:

```bash
docker compose --env-file frontend/.env up --build
```

O backend continua lendo backend/.env no runtime do Compose. Para acessar o
frontend local na porta 80, configurar FRONTEND_URL=http://localhost no .env
do backend (nao usar essa URL nos ambientes Azure).

## Observabilidade e evidencias

Backend em producao gera logs JSON. A telemetria registra metodo, template de
rota, status, duracao e ID gerado no servidor; nao registra body, token ou query.
Healthchecks sao omitidos para reduzir ruido. Logs de erro preexistentes devem
ser revisados antes de processar dados pessoais; este middleware nao sanitiza
logs emitidos por outros componentes. Nao ha tracing distribuido nesta etapa.

No Azure Monitor > Workbooks abrir `BigPecas <ambiente> - operacao`. Conferir
requisicoes/p95 e consultar CPU, memoria e replicas nas metricas da aplicacao.
A regra `errors-bigpecas-<ambiente>` consulta logs a cada 5 minutos e avisa
por email se houver erro. Validar entrega do grupo de acao com o recurso de teste
do Azure Monitor; um teste de notificacao nao comprova a consulta do alerta.
Em dev, numa janela autorizada, simular falha de dependencia de forma controlada,
registrar o alerta real e restaurar a configuracao. Nao criar endpoint publico
que force erros e nao provocar falha em prod para obter evidencia.

Em incidente: anotar horario/ambiente/requestId, consultar logs e ultimo commit,
comparar metricas, corrigir via PR e verificar a recuperacao. Registrar na tarefa
a causa, a acao e a evidencia posterior. Nao ha alerta externo de disponibilidade
24h configurado; smoke ocorre somente no deploy. Adicionar monitor sintetico se
essa cobertura for exigida. A entrega nao equivale a monitoramento completo.

Guardar links de runs, commit, artefatos de testes, digests, URLs, print dos tres
ambientes, workbook, alerta recebido e melhoria feita com base no monitoramento.
Artefatos de CI expiram em 14 dias; os de deployment em 30. Uma execucao local
ou YAML versionado sozinho nao atende a evidencia de funcionamento continuo.

## Rollback e colaboracao

Uma release que falha no smoke nao avanca, mas pode ja ter alterado aquele
ambiente. Nao ha rollback automatico nem rollback de banco. Antes de producao,
guardar digests e parametros da versao anterior. Reverter o commit por PR e
executar a pipeline novamente e a recuperacao padrao por codigo; para retorno
exato ao binario anterior, reaplicar apps.bicep com os digests registrados e
parametros corretos em sessao autorizada. Validar compatibilidade de schema.

Todos os computadores usam o mesmo repositorio/pipeline; nao precisam de Azure
CLI para dar commit. Alteracoes passam por PR; apenas o GitHub usa a identidade
de deploy. Nao excluir recursos antigos, grupos ou imagens sem aprovacao.

## Referencias

- [OIDC no Azure](https://learn.microsoft.com/en-us/azure/developer/github/connect-from-azure-openid-connect)
- [OIDC e protecao de ambientes GitHub](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-azure)
- [Container Apps Bicep](https://learn.microsoft.com/en-us/azure/templates/microsoft.app/containerapps)
