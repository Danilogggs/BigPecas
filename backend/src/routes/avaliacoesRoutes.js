const express = require('express');
const controller = require('../modules/avaliacoes/composition');

const router = express.Router();
router.get('/pedidos/:pedidoId', controller.estado);
router.post('/fornecedores', controller.avaliarFornecedor);
router.post('/produtos', controller.avaliarProduto);
router.get('/fornecedores/:fornecedorId', controller.fornecedor);
router.get('/produtos/:pecaId', controller.produto);

module.exports = router;
