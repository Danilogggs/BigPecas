# Avaliação de peças e moeda — implementação integrada

## Antes de publicar a aplicação

1. Faça backup e ensaie em uma cópia de staging com o schema PostgreSQL existente.
2. Execute **backend/supabase/migrations/20260830_avaliacao_moeda_segura.sql** como owner do banco Supabase. A migration é independente do antigo rascunho 001, transacional, reexecutável e usa lock_timeout de 5 segundos. Em timeout/erro, a transação deve ser revertida; investigue antes de tentar novamente.
3. Execute **backend/supabase/verify_avaliacao_moeda.sql** em staging. Ele cria dados de teste, verifica transições, snapshots e permissões e termina com ROLLBACK. Este teste ainda não foi executado nesta entrega.
4. Configure as taxas das moedas que serão utilizadas. Depois, publique backend e frontend juntos.

**Impacto no catálogo existente:** peças sem avaliação nesta nova estrutura passam a pendentes. Não há aprovação retroativa automática. Isso inclui anúncios anteriormente publicados pela implementação parcial. Agende a implantação e a revisão do acervo para evitar uma surpresa operacional.

Nenhuma migration foi aplicada ao banco real durante esta implementação.

## Banco e segurança

- Mantém public.users.id como bigint e resolve o usuário autenticado pelo email verificado pelo Supabase; o UUID de autenticação nunca é usado como ID do avaliador.
- Novo papel avaliador selecionável no cadastro inicial. Alterações comuns de perfil preservam o papel; is_admin nunca é aceito do cadastro.
- pecas nasce pendente por trigger, mesmo se um cliente tentar publicar diretamente.
- Mudanças no conteúdo, mídia ou preço base geram nova revisão e retiram a peça do catálogo. Alterar estoque não exige outra avaliação.
- avaliacoes_pecas armazena uma linha por anúncio/revisão, critérios completos em criterios_snapshot, respostas, avaliador, observação e datas.
- Critérios ficam congelados quando a revisão entra na fila. Edições do admin valem para os próximos envios; nunca alteram um checklist já apresentado ao avaliador.
- decidir_avaliacao_peca faz a decisão, publicação e notificação na mesma transação, com bloqueio da linha. Rejeita revisões antigas, segunda decisão, autoavaliação, critérios faltantes/duplicados, respostas não booleanas e aprovação sem critérios.
- Não há aprovação se algum obrigatório for negativo. A reprovação explícita exige motivo, inclusive quando os checks estiverem positivos.
- Histórico decidido é imutável. Remover anúncio pela aplicação agora arquiva a peça, preservando as avaliações e relações existentes.
- RPC de decisão e tabelas de avaliação são acessíveis somente ao backend service_role. Gravações diretas em pecas por anon/authenticated são revogadas; a leitura pública tem política restritiva de publicação.
- As tabelas antigas validacao_peca/checklist_respostas_validacao, se existentes, não são apagadas nem reescritas. O novo fluxo não depende delas.
- A migration pressupõe os nomes public.users, public.pecas e public.notificacoes do schema fornecido e os papéis Supabase anon/authenticated/service_role. Se houver schema customizado ou restrições extras, revise a compatibilidade em staging; não remova restrições silenciosamente.

## Interface e notificações

- /avaliador: fila paginada e contagens.
- /avaliador/validar/:pecaId: mídia, dados técnicos, série, checklist congelado, aprovação/publicação e reprovação.
- /admin/checklist: criar, editar, ativar/desativar, definir ordem e obrigatoriedade. Acesso pelo painel administrativo.
- Todos os avaliadores existentes recebem notificação interna por novo anúncio/revisão (exceto o próprio anunciante). O vendedor recebe a decisão.
- Notificações aparecem no sistema existente, com ligação para avaliação ou edição. Não foi acrescentado envio de email.
- Cadastro/edição preservam imagem e URL HTTPS de vídeo MP4/WebM. O vídeo precisa estar hospedado em endereço acessível ao navegador; não há upload binário de vídeos ou integração com YouTube nesta entrega.
- Catálogo, fornecedores, recomendações, favoritos e criação de pedidos só usam peças publicadas. O dono pode abrir anúncios não publicados para editá-los. Histórico de pedidos mantém seus dados anteriores.

## Verificação de série futura

Campos preparados: num_serie, status_api_serie, dados_api_validacao e verificado_serie_em.
Estados aceitos: nao_verificado, pendente, aprovado, reprovado e erro.
Alterar num_serie limpa resultados anteriores. Não existe chamada a uma API fictícia nem aprovação automática por um resultado não verificado. O critério “Peça real?” é manual enquanto a integração não existir.

## Moeda e faixas

- preco_base/moeda_base são a fonte original de preço. preco permanece um valor compatível em BRL para o sistema legado.
- taxas_cambio.unidades_por_brl significa quantas unidades da moeda equivalem a 1 BRL.
- Apenas BRL vem configurado (1). USD/EUR começam sem cotação: não se inventam taxas atuais.
- Configure as taxas via SQL administrativo, usando valores obtidos da fonte escolhida por você, e registre a fonte/data. Exemplo parametrizado para psql:

~~~sql
UPDATE public.taxas_cambio
SET unidades_por_brl = :'usd_por_brl'::numeric,
    fonte = :'fonte_cambio',
    atualizado_em = now()
WHERE moeda = 'USD';
~~~

- Recarregue a aplicação após configurar as taxas. O seletor permite moeda explícita ou região associada ao idioma (PTBR→BRL, EN→USD, FR→EUR); se a taxa não estiver configurada, permanece em BRL.
- A view precos_publicos_moeda calcula preços a partir da base sem cache por produto. Busca e ordenação por preço usam o valor na moeda de exibição. Há faixas derivadas de 0–500, 500–5000 e 5000+ BRL no endpoint /api/moeda/categorias.
- A homepage oferece atalhos de faixa convertidos, e o filtro do catálogo identifica sua moeda.
- O pedido recalcula o preço em BRL no servidor usando a taxa configurada no momento. Valores de pedidos/vendas históricos não são reescritos. Carrinho/checkout continuam em BRL; isto não implementa processamento de pagamentos em moeda estrangeira.
- Não há atualização automática de cotações por serviço externo. A operação é responsável por manter a configuração atualizada.

## Verificações

- Frontend: 28 suítes e 437 testes passaram, incluindo os testes da tela de avaliação. Build final aprovado.
- Regressão sem dependências extras: node --test backend/scripts/review-regression.test.cjs.
- Testes da tela: frontend/src/pages/__tests__/ValidarPecaPage.test.jsx.
- Build: npm --prefix frontend run build.
- A suíte Jest completa do backend não pôde ser executada: suas dependências de desenvolvimento não estão instaladas. A instalação adicional não foi autorizada.
- A migration recebeu revisão estática, mas ainda exige o ensaio PostgreSQL de staging acima.


