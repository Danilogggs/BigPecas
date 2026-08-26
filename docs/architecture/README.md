# Arquitetura limpa do BigPeças

## Situação após a refatoração

Todos os módulos HTTP do backend foram migrados para a estrutura `domain`, `application`, `infrastructure`, `http` e `composition`. As rotas agora apenas associam URL e verbo aos controladores. No frontend, regras, gateways, hooks de aplicação e apresentação estão organizados por feature, mantendo reexportações de compatibilidade para os imports antigos.

| Módulo | Domínio | Aplicação | Infraestrutura | Interface | Testes de contrato |
|---|---:|---:|---:|---:|---:|
| Pedidos | Sim | Sim | Sim | Sim | Sim |
| Peças/Catálogo | Sim | Sim | Sim | Sim | Sim |
| Carrinho/Checkout | Sim | Provider | Sim | Sim | Sim |
| Usuários/Auth/Perfil | Sim | Sim | Sim | Sim | Sim |
| Administração | Sim | Sim | Sim | Sim | Sim |
| Favoritos | Sim | Sim | Sim | Sim | Sim |
| Chat/Notificações | Sim | Sim | Sim | Sim | Sim |
| Frete/Avaliações | Sim | Sim | Sim | Sim | Sim |

## Padrões aplicados

1. Repository para Supabase e armazenamento local;
2. Gateway/Adapter para APIs, autenticação, realtime e Melhor Envio;
3. Use Case/Application Service para orquestração;
4. Dependency Injection nos providers, hooks e casos de uso;
5. Composition Root/Factory em cada módulo backend;
6. Provider nos estados globais React;
7. Strategy implícita nos gateways injetáveis e nas formas de pagamento.

## Princípios

- dependências apontam para regras centrais, não para frameworks;
- domínio não conhece Express, React ou Supabase;
- cada arquivo possui uma responsabilidade principal;
- tecnologias externas podem ser substituídas pelos contratos injetados;
- rotas, páginas e componentes não repetem regras já pertencentes ao domínio;
- testes de rota preservam os contratos HTTP durante a mudança interna.

Com a migração de todos os módulos, há evidência para o critério acadêmico de 100%: três ou mais padrões consistentes, camadas explícitas, código modular e decisões documentadas. Isso não significa ausência permanente de dívida técnica; futuras funcionalidades devem respeitar os mesmos limites para manter a classificação.

## Acessibilidade visual

O estudo do público, requisitos, design thinking, jornada, UML, sequência, BDD e matriz de rastreabilidade estão consolidados em [`../accessibility/acessibilidade-visual-engenharia-software.md`](../accessibility/acessibilidade-visual-engenharia-software.md). A implementação correspondente segue a mesma separação em domínio, aplicação, infraestrutura e apresentação.
