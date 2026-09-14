# Inicializacao do banco novo Bigpecas-Dev/Qas

**Status em 14/09/2026: baseline reconciliada e testada localmente.** Pronta para
homologacao em um Dev/Qas vazio, nao para substituir producao. Nenhuma execucao
remota foi realizada. A seguranca de SECURITY-ROLLOUT.md ja esta incorporada ao
bootstrap, em uma unica transacao.

Destino aprovado: `https://xbnqilfmjomudfupwmrk.supabase.co`.
Nao executar no BigPecas de producao. Nao usar o arquivo legado
DATABASE_SCHEMA_UPDATED.sql diretamente: sua ordem original nao e executavel.

## Executar pelo SQL Editor

1. Confirmar o nome Bigpecas-Dev/Qas e a referencia `xbnqilfmjomudfupwmrk`
   na URL do painel. O script nao consegue deduzir com seguranca o project ref
   de uma sessao SQL Editor; a confirmacao visual continua obrigatoria.
2. Abrir uma consulta nova, usando o papel `postgres`.
3. Copiar **todo** o conteudo de `setup-devqas.sql` para a consulta, sem selecionar
   apenas um trecho, e executar. O arquivo tem uma unica transacao.
4. Aguardar o resultado "Estrutura Dev/Qas criada...". Se houver erro, parar
   e informar a mensagem; nao remover protecoes nem tentar o schema legado.
5. Nao executar novamente apos sucesso. O script rejeita bancos com tabelas
   publicas ou contas Auth existentes. Novas mudancas precisam de migrations.

O bootstrap cria as 19 tabelas, 3 views, 9 funcoes de negocio e 5 triggers
exportados, mais uma funcao de identidade para seguranca. Habilita RLS em todas
as tabelas e atribui permissoes explicitamente.
Insere somente categorias, materiais, checklist e configuracao inicial de moedas.
Nao cria usuarios, administradores, anuncios, compras, senhas ou dados pessoais.
Nao inventa taxas de cambio: BRL=1; USD/EUR ficam sem taxa ate configuracao.

As demais tabelas ficam acessiveis apenas ao backend com service_role. O chat
permite a authenticated ler conversas das quais participa e inserir apenas como
o proprio remetente; nao permite alterar/apagar mensagens. A identidade deriva
do Auth UUID e email confirmado na tabela auth.users, nunca de user_metadata.
O perfil public.users e criado pelo backend atual apos o cadastro/login; nao ha
trigger copiando privilegios administrativos dos metadados do cadastro.

Mensagens entram na publicacao supabase_realtime se ela existir. O teste local
verifica SQL/RLS, nao a entrega WebSocket do servico gerenciado. Validar o chat
com duas contas ficticias depois da configuracao completa.

## Origem e validacao

A origem e production-schema.snapshot.json: metadados das tres exportacoes
fornecidas pelo usuario, sem dados pessoais ou credenciais. Constraints e FKs
sao criadas depois das tabelas, respeitando dependencias. Os quatro objetos
obsoletos do rascunho anterior nao sao criados. Defaults, nulabilidade, identity,
indices, views e triggers seguem o material exportado, inclusive cascatas e o
nome historico whitelist_id_seq. Funcoes de exclusao sao definidas, nao chamadas.

Limite importante: a exportacao nao informa limites varchar, precisao/escala
numeric, collations, parametros de sequences, objetos Auth/Storage ou configuracao
de emails. Tipos varchar/numeric ficam sem limites declarados; portanto esta
baseline NAO e um clone integral de producao. Para equivalencia exata, obter
um schema-only dump antes de promover esta baseline para outros usos.

As permissoes amplas de producao NAO sao reproduzidas: sao substituidas pela
migration 20260914. A logica de fornecedor_stats foi preservada; seus joins
podem multiplicar valores agregados quando ha varias vendas/avaliacoes/pecas.
Esse comportamento preexistente exige uma revisao funcional separada.

Validacao em PostgreSQL local PGlite 0.5.8 com Auth simulado e auto-RLS habilitado:
29 verificacoes aprovadas (estrutura, permissoes, chat, aprovacao/revisao de
anuncios e bloqueio de reexecucao). Nenhuma conexao ao banco remoto foi feita.
Nao substitui testes de integracao com Supabase Auth, PostgREST e Realtime.

```sh
npm ci --prefix scripts/devops
npm test --prefix scripts/devops
```

## Depois da estrutura

Configurar URLs de redirecionamento Auth de dev/test, email e variaveis do
backend/frontend apontando ao Dev/Qas. As chaves privilegiadas devem ir em
secrets/arquivo .env ignorado pelo Git, nunca no chat ou VITE. Trocar qualquer
senha anteriormente compartilhada antes de conectar ferramentas ao banco.
O bootstrap nao modifica .env nem a infraestrutura Azure. O deploy continua
desabilitado ate a configuracao de contas, credenciais e testes funcionais.
