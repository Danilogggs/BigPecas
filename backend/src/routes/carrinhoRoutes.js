const express = require('express');
const controller = require('../modules/carrinho/composition');

const router = express.Router();
router.get('/', controller.obter);
router.put('/', controller.salvar);

module.exports = router;
