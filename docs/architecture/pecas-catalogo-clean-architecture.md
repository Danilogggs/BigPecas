# Arquitetura do módulo de peças e catálogo

## Escopo

Esta migração abrange cadastro, consulta, atualização e exclusão de peças,
categorias, materiais, perfis públicos de fornecedores, ranking e recomendações.
Os endpoints e seus formatos de resposta foram preservados.

## Camadas do backend

```text
routes -> http/controller -> application/use cases -> domain
                                  |
                                  v
                         repository interface
                                  ^
                                  |
                    Supabase repository adapter
```

- `domain/peca.js`: valida ids, filtros, payloads, permissões, paginação, ranking e similaridade.
- `application/criarPecasUseCases.js`: orquestra os dez casos de uso do módulo.
- `infrastructure/SupabasePecasRepository.js`: concentra todas as consultas às cinco tabelas.
- `http/criarPecasController.js`: adapta requisição, resposta e headers de paginação.
- `composition.js`: cria as implementações e injeta o repository nos casos de uso.
- `routes`: declara somente método, caminho e controller.

## Camadas do frontend

- `features/pecas/domain/peca.js`: formulário canônico, validações, normalizadores, busca e faixa de preço.
- `features/pecas/application/useCatalogoPecas.js`: estado, debounce, paginação, ordenação e wishlist do catálogo.
- `features/pecas/presentation/pecaPresentation.js`: moeda e data localizadas.
- `services/pecasService.js`: adapter HTTP mantido atrás do contrato injetável do hook.
- páginas: composição e apresentação; cadastro, edição e detalhe reutilizam as regras compartilhadas.

## Padrões e princípios

1. **Repository** isola o Supabase.
2. **Application Service / Use Case** concentra a orquestração e autorização.
3. **Adapter** converte HTTP e Supabase para contratos internos.
4. **Dependency Injection** permite substituir repository e gateway em testes.
5. **Composition Root / Factory** centraliza a construção do módulo.
6. **Single Source of Truth** elimina formulários, regex e normalizadores duplicados no frontend.

O domínio não importa Express, React ou Supabase. As bordas dependem das regras,
e não o contrário. Isso reduz acoplamento e permite testar ranking, filtros e
normalizações sem navegador ou banco.

## Evidências de regressão

- 65 testes de rota cobrem peças e catálogo no backend.
- 38 testes cobrem o adapter HTTP de peças no frontend.
- testes puros cobrem normalização, catálogo, busca textual e faixa de preço.
- o build Vite valida todas as páginas consumidoras.

## Próximo módulo

O agregado seguinte foi carrinho e checkout. Ele separou cálculo
de totais, persistência local, criação de pedido e apresentação, seguindo a mesma
regra de dependência adotada em pedidos e peças.
