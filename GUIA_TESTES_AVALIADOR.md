# Verificação do fluxo Avaliador

Resultados desta entrega:
- Frontend: 28 suítes, 437 testes aprovados.
- Regressão do backend sem instalação extra: 9 testes aprovados.
- Build final do frontend aprovado.
- 70 arquivos JavaScript do backend passaram pela verificação de sintaxe.
- O backend carregou suas rotas com configuração de teste, sem abrir servidor ou acessar banco.
- A suíte Jest completa do backend ficou pendente por ausência das dependências de desenvolvimento.
- A migration ainda NÃO foi executada em PostgreSQL. Não aplicar diretamente em produção sem staging.

Comandos:
~~~text
npm --prefix frontend test -- --runInBand
npm --prefix frontend run build
node --test backend/scripts/review-regression.test.cjs
~~~

Em staging:
1. Aplicar backend/supabase/migrations/20260830_avaliacao_moeda_segura.sql.
2. Executar backend/supabase/verify_avaliacao_moeda.sql (finaliza com ROLLBACK).
3. Reaplicar a migration e confirmar ausência de duplicações.
4. Cadastrar vendedor e dois avaliadores. Criar anúncio; verificar fila e notificações.
5. Abrir o mesmo anúncio nos dois avaliadores. Aprovar no primeiro; o segundo deve receber conflito.
6. Confirmar publicação em busca, fornecedores e favoritos. Usuário comum não pode acessar a avaliação.
7. Editar a peça como vendedor. Confirmar que sai do catálogo e que a avaliação anterior permanece imutável.
8. Alterar/ordenar/desativar critérios como admin. Confirmar snapshot antigo e novos critérios somente nos próximos envios.
9. Testar reprovação com motivo, vídeo HTTPS e campos de série. Alterar série e verificar limpeza do resultado anterior.
10. Configurar taxas de teste em staging; conferir preço base preservado, conversão, filtro, ordenação e cobrança em BRL.
11. Testar acesso direto com anon/authenticated: sem gravação em peças/avaliações e sem execução da RPC de decisão.

Consulte GUIA_IMPLEMENTACAO_AVALIADOR_MOEDA.md para impactos no acervo existente, configuração de câmbio e implantação.

