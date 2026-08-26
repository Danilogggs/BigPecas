# Carrinho e checkout

## Responsabilidades

- `features/carrinho/domain`: regras puras de itens, totais, descontos, validações e máscaras.
- `features/carrinho/infrastructure`: persistência do carrinho no `localStorage`.
- `features/carrinho/presentation`: formatação de valores para a interface.
- `contexts/CartContext`: adaptador React que injeta o repositório e expõe os casos de uso à árvore de componentes.
- `pages/CarrinhoPage` e `pages/CheckoutPage`: composição visual e coordenação das ações do usuário.

As páginas deixaram de definir regras duplicadas de totalização e validação. O domínio não importa React, navegador, Supabase nem tradução, portanto pode ser testado isoladamente.

## Padrões aplicados

- Repository: `localStorageCartRepository` encapsula a tecnologia de persistência.
- Dependency Injection: `CartProvider` aceita outro repositório sem alterar o contexto.
- Provider: o contexto entrega as operações do carrinho aos componentes.
- Single Responsibility: cálculo, armazenamento, formatação e renderização estão separados.
