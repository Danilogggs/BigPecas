# Favoritos

No backend, `modules/favoritos` separa validação e ordenação (`domain`), fluxo do usuário autenticado (`application`), consultas Supabase (`infrastructure`) e HTTP (`http`). A rota contém apenas quatro associações.

No frontend, `features/favoritos` contém regras puras da coleção, o gateway HTTP e o hook de aplicação da tela. `pecasService` mantém reexportações temporárias para compatibilidade, mas não implementa mais operações de Favoritos.
