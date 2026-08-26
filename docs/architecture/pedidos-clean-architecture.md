# Arquitetura do módulo de pedidos

## Objetivo

O módulo de pedidos é o primeiro módulo de referência para a evolução arquitetural do BigPeças. A refatoração preserva os endpoints e o comportamento externo, mas separa regras de negócio, orquestração, acesso a dados e Express.

## Camadas e regra de dependência

```text
routes -> http/controller -> application/use cases -> domain
                                  |
                                  v
                         repository (contrato usado)
                                  ^
                                  |
                    infrastructure/Supabase adapter
```

- **Domínio**: status, transições, cálculos e representações de compra/venda. Não conhece Express nem Supabase.
- **Aplicação**: executa os casos de uso de listar, detalhar, criar e atualizar pedidos. Depende de colaboradores recebidos por injeção.
- **Infraestrutura**: implementa o acesso a pedidos, peças e usuários com Supabase.
- **Interface HTTP**: traduz `req`/`res` para entradas e saídas dos casos de uso.
- **Composition root**: instancia e conecta as dependências em um único lugar.

## Padrões aplicados

1. **Repository**: `SupabasePedidosRepository` encapsula consultas e comandos do Supabase. Trocar o banco não exige alterar regras de negócio ou controllers.
2. **Application Service / Use Case**: `criarPedidosUseCases` concentra a orquestração de cada ação do usuário e as regras de autorização.
3. **Adapter**: o controller adapta Express aos casos de uso; o repositório adapta Supabase à aplicação.
4. **Dependency Injection**: repositório, vendas, e-mail, relógio, gerador aleatório e logger entram como dependências. Isso reduz acoplamento e facilita testes determinísticos.
5. **Composition Root / Factory**: `composition.js` é o único ponto que conhece as implementações concretas e cria o módulo.

## Princípios de design

- **Responsabilidade única**: cada arquivo tem um motivo principal para mudar.
- **Inversão de dependência**: a aplicação recebe colaboradores em vez de criar o cliente Supabase.
- **Aberto/fechado**: novos adaptadores de persistência ou notificação podem ser adicionados sem reescrever o domínio.
- **Alta coesão e baixo acoplamento**: regras de pedido permanecem juntas e detalhes externos ficam nas bordas.
- **Contratos estáveis**: os endpoints `/api/pedidos`, `/historico`, `/:id` e `/:id/status` não foram alterados.

## Estrutura

```text
backend/src/modules/pedidos/
  application/criarPedidosUseCases.js
  domain/pedido.js
  http/criarPedidosController.js
  infrastructure/SupabasePedidosRepository.js
  composition.js
backend/src/routes/pedidosRoutes.js
frontend/src/features/pedidos/domain/pedido.js
frontend/src/features/pedidos/presentation/
frontend/src/contexts/OrderContext.jsx
frontend/src/services/pedidosService.js
```

No frontend, o arquivo de domínio reúne status, normalização e seletores puros. O
`OrderProvider` funciona como serviço de aplicação e recebe um gateway por
injeção; `pedidosService` permanece como adaptador HTTP. As páginas consomem o
estado e renderizam a interface, sem repetir cálculos e normalizações.

## Decisão e critério

A migração é feita por módulo, começando por pedidos, porque ele reúne persistência, autorização, cálculo, notificação e integrações. Validar a estrutura neste fluxo reduz o risco antes de replicá-la em peças, usuários, favoritos e frete. Os testes de rota já existentes continuam sendo o contrato de regressão do módulo.

## Limite conhecido preservado

O cálculo histórico do cupom de frete grátis foi mantido para não mudar uma regra funcional durante uma refatoração arquitetural. A correção deve ser tratada em uma tarefa de regra de negócio, com atualização explícita do teste correspondente.

## Critério de conclusão por módulo

Um módulo só é considerado migrado quando:

1. regras de negócio não importam framework, banco ou componentes visuais;
2. persistência e APIs externas estão atrás de adapters/repositories;
3. casos de uso recebem dependências e não instanciam infraestrutura;
4. rotas e páginas apenas adaptam entrada, saída e apresentação;
5. contratos de regressão passam e o frontend gera build de produção;
6. padrões e decisões relevantes estão documentados.

## Migração concluída

Peças/catálogo, carrinho/checkout, usuários/autenticação/perfil, administração,
favoritos, chat/notificações e frete/avaliações foram migrados seguindo o mesmo
critério. A avaliação consolidada e as evidências estão no índice desta pasta.
