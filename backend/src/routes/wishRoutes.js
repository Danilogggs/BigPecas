const express = require('express');
const controller = require('../modules/favoritos/composition');

const router = express.Router();
router.get('/', controller.listar);
router.get('/status/:pecaId', controller.status);
router.post('/:pecaId', controller.adicionar);
router.delete('/:pecaId', controller.remover);

module.exports = router;
