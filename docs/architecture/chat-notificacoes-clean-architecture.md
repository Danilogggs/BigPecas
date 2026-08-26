# Chat e notificações

## Chat

As regras de conversa bidirecional, agrupamento, deduplicação de eventos realtime e identificação de participantes ficam em `features/chat/domain`. O gateway Supabase implementa consultas e inscrições; `useConversa` e `useConversasAtivas` coordenam o estado React. As páginas ficaram responsáveis pela renderização.

## Notificações

O backend usa domínio, casos de uso, repositório Supabase, controlador e raiz de composição. No frontend, o gateway HTTP, o hook da lista, as regras de leitura e a formatação de data estão separados. A página passou a usar as variáveis globais de tema, incluindo modo escuro.
