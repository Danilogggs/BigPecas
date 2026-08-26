const express = require('express');
const controller = require('../modules/pecas/composition');

const router = express.Router();

router.get('/categorias', controller.categorias);
router.get('/materiais', controller.materiais);

module.exports = router;
