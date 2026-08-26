const express = require('express');
const controller = require('../modules/pedidos/composition');

const router = express.Router();

router.get('/historico', controller.historico);
router.get('/', controller.listar);
router.get('/:id', controller.detalhar);
router.post('/', controller.criar);
router.patch('/:id/status', controller.atualizarStatus);

module.exports = router;
