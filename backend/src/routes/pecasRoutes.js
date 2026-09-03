const express = require('express');
const controller = require('../modules/pecas/composition');

const router = express.Router();

router.post('/cadastrar', controller.cadastrar);
router.get('/', controller.listar);
router.get('/fornecedores/recomendados', controller.fornecedoresRecomendados);
router.get('/fornecedores/:id/perfil', controller.perfilFornecedor);
router.get('/recomendacoes/historico', controller.recomendacoesHistorico);
router.get('/:id/recomendacoes', controller.recomendacoes);
router.get('/:id', controller.detalhar);
router.put('/:id', controller.atualizar);
router.delete('/:id', controller.deletar);

module.exports = router;
