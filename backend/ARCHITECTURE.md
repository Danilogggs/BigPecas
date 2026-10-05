# Arquitetura do backend

## Objetivo

O backend adota uma arquitetura limpa pragmatica, organizada por modulos de
negocio. A regra central e que detalhes externos dependem da aplicacao, nunca o
contrario. Express, Supabase, Melhor Envio e provedores de e-mail ficam nas
bordas do sistema.

## Camadas e regra de dependencia

```text
routes -> composition -> http -> application -> domain
                         |           |
                         |           +-> portas recebidas por injecao
                         +-> infrastructure (implementa as portas)
```

| Camada | Responsabilidade | Pode conhecer |
| --- | --- | --- |
| `domain` | Regras, validacoes, calculos e estados do negocio | Biblioteca padrao e erros da aplicacao |
| `application` | Orquestracao dos casos de uso | Dominio e portas injetadas |
| `infrastructure` | Supabase e APIs externas | SDKs externos e contratos exigidos pela aplicacao |
| `http` | Traducao entre HTTP/Express e casos de uso | Express por meio de `req`, `res` e `next` |
| `composition.js` | Montagem do grafo de objetos | Todas as implementacoes necessarias ao modulo |
| `routes` | Declaracao de URL, verbo e middleware | Controllers ja compostos |

Os casos de uso nao importam o cliente Supabase, o Express nem gateways
concretos. Eles recebem dependencias por parametro, o que permite testes com
dubles e troca de tecnologia sem alterar as regras de negocio.

## Padroes aplicados

### 1. Repository (Enterprise Application Architecture)

Arquivos como `SupabasePecasRepository.js` e `SupabasePedidosRepository.js`
encapsulam consultas, comandos e detalhes do SDK. A camada `application`
consome apenas operacoes orientadas ao negocio (`buscarPecaPorId`,
`criarPedido`, `atualizarStatus`). Isso reduz acoplamento e evita consultas ao
banco espalhadas pelos controllers.

### 2. Adapter (GoF / Ports and Adapters)

Os controllers em `modules/*/http` convertem requisicoes HTTP em entradas dos
casos de uso. O adaptador compartilhado `src/http/adaptarController.js` trata a
fronteira assincrona do Express e envia erros ao middleware central, sem
duplicar essa responsabilidade em cada modulo. `MelhorEnvioGateway.js` e outro
adaptador: traduz a porta de frete para a API externa.

### 3. State Machine (State)

O dominio de pedidos define os estados e transicoes permitidas em
`modules/pedidos/domain/pedido.js`. A aplicacao consulta
`transicaoEhPermitida` em vez de espalhar condicionais de fluxo. Novos estados
podem ser adicionados alterando a tabela de transicoes e seus testes.

### 4. Factory + Composition Root

Factories `criar*UseCases`, `criar*Controller` e `criar*Repository` constroem
objetos coesos. Cada `composition.js` e o unico ponto do modulo que escolhe as
implementacoes concretas e injeta dependencias. Essa decisao aplica inversao
de dependencia e torna os casos de uso testaveis isoladamente.

## SOLID na pratica

- **SRP:** dominio valida regras; casos de uso orquestram; repositorios
  persistem; controllers traduzem HTTP.
- **OCP:** um novo gateway ou repositorio pode ser conectado no composition
  root sem reescrever o caso de uso.
- **LSP:** qualquer implementacao que cumpra as operacoes consumidas pelo caso
  de uso pode substituir o adaptador Supabase nos testes ou em producao.
- **ISP:** cada modulo recebe somente o repositorio/gateway de que precisa, em
  vez de um servico global com dezenas de metodos.
- **DIP:** regras de aplicacao dependem de portas injetadas; SDKs concretos sao
  instanciados apenas na composicao.

## Fluxo de uma requisicao

Exemplo: criacao de pedido.

1. `routes/pedidosRoutes.js` associa `POST /api/pedidos` ao controller.
2. O controller traduz `req.user` e `req.body` para a entrada do caso de uso.
3. `criarPedidosUseCases.js` valida e executa as regras do pedido.
4. O caso de uso chama a porta `repository`; nao conhece Supabase.
5. `SupabasePedidosRepository.js` traduz a operacao para o SDK.
6. O controller devolve a resposta; erros seguem para o middleware central.

## Convencoes para evolucao

1. Regra pura de negocio entra em `domain` e deve ter teste unitario.
2. Orquestracao entra em `application` e recebe efeitos externos por injecao.
3. SDK, banco ou HTTP externo entram em `infrastructure`.
4. Conversao de protocolo entra em `http`.
5. Dependencias concretas sao escolhidas somente em `composition.js`.
6. Nenhum caso de uso deve importar Express, Supabase ou variaveis de ambiente.
7. Toda nova transicao de pedido deve ser declarada na maquina de estados.

## Evidencias verificaveis

- Testes de rotas cobrem a integracao HTTP.
- Testes de dominio cobrem regras puras.
- `tests/http/adaptarController.test.js` protege o Adapter compartilhado.
- Dependencias externas podem ser substituidas por mocks nas factories de
  casos de uso, demonstrando baixo acoplamento.
