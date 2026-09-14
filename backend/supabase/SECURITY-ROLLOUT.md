# Correcao de acesso direto: proposta, nao aplicada

Arquivo: migrations/20260914_restringir_acesso_dados.sql.
Autorizacao recebida somente para preparar e testar, nao executar na nuvem.

## Evidencia

A exportacao fornecida em 14/09/2026 mostra RLS desativado e grants amplos para
anon/authenticated em users, mensagens, pedidos, vendas e outras tabelas.
Tambem ha views antigas com acesso anonimo. Isso e uma configuracao de risco,
nao evidencia de que alguem tenha explorado ou extraido os dados. Nenhuma
tentativa de acesso remoto ou alteracao de producao foi realizada.

## Escopo e impacto

- Habilita RLS nas 19 tabelas atuais do aplicativo.
- Revoga grants de tabela E coluna para PUBLIC/anon/authenticated, incluindo
  TRUNCATE, e restringe views e funcoes administrativas conhecidas.
- Preserva CRUD para service_role e acesso a sequences, inclusive quando o
  nome da sequence difere do nome da tabela (ex.: whitelist_id_seq).
- Mantem chat direto: usuario confirmado pode ler somente suas conversas e
  inserir como o proprio remetente. Policies restritivas resistem a policies
  permissivas antigas; UPDATE/DELETE e IDs/timestamps fornecidos sao negados.
- Perfil ambiguo (emails que diferem apenas por maiusculas) fica sem acesso ao
  chat ate revisao manual. Nao remove duplicatas ou mensagens antigas.
- Ajusta defaults de objetos futuros criados como postgres. Outros papeis de
  criacao, schemas, Storage, configuracoes Auth e chaves exigem auditoria propria.
- Nao altera dados, estrutura de colunas, triggers de negocio nem contas Auth.

O frontend atual consulta mensagens diretamente; demais dados passam pelo
backend service_role. Clientes antigos/integracoes que consultem tabelas ou
views diretamente podem deixar de funcionar. Confirmar com a equipe antes
de aplicar. O backend deve continuar validando token, titularidade e papel:
service_role ignora RLS, portanto esta migration nao corrige falhas da API.

## Validar primeiro

1. Para Dev/Qas vazio, usar setup-devqas.sql, reconciliado com os metadados
   exportados e com esta migration incorporada. Ver limites em DEVQAS.md:
   nao e um dump integral de producao.
2. Revisar o schema Dev/Qas e preparar dados ficticios, sem copiar dados pessoais.
3. Em Dev/Qas ja inicializado pelo bootstrap, a migration ja esta aplicada;
   nao e necessario reaplica-la. Em outro banco, revisar antes de executar.
4. Validar com contas ficticias: cadastro/login, perfil, catalogo, pedidos,
   painel administrativo, envio/recebimento de chat e Realtime. Testar um terceiro
   usuario sem participacao: ele nao deve ler a conversa nem falsificar remetente.
5. Confirmar que tentativas sem login de ler/escrever users/pedidos/vendas falham.
6. Registrar resultados e testar a compatibilidade com os outros computadores.

Teste local automatizado: `npm test --prefix scripts/devops`. O teste simula
grants inseguros, acesso por coluna e policy permissiva antiga em PostgreSQL
PGlite. Isso nao comprova Auth/PostgREST/Realtime no servico Supabase real.

## Producao: somente com nova autorizacao

Antes de aplicar: guardar backup seguro de dados e schema, ACLs/policies/default
privileges atuais; revisar as dependencias e combinar janela de manutencao.
SQL usa transacao, lock_timeout de 5s e statement_timeout de 120s: erro aborta
o conjunto. Em falha, nao executar trechos isolados e nao desativar protecoes.

Nao ha rollback automatico depois do COMMIT. Restaurar os grants antigos
reabriria a exposicao. Se houver incompatibilidade, corrigir o consumidor ou
conceder apenas a permissao minima revisada; nao usar GRANT ALL como atalho.
Nao ativar a pipeline para executar esta migration automaticamente.
