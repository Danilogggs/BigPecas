const express = require('express');
const verifyToken = require('../middlewares/verifyToken');
const controller = require('../modules/notificacoes/composition');

const router = express.Router();
router.get('/nao-lidas/count', verifyToken, controller.contar);
router.get('/', verifyToken, controller.listar);
router.patch('/:id/lida', verifyToken, controller.marcarComoLida);

module.exports = router;
