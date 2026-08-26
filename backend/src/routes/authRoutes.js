const express = require('express');
const verifyToken = require('../middlewares/verifyToken');
const controller = require('../modules/usuarios/composition');

const router = express.Router();

router.get('/health', controller.health);
router.post('/register', controller.cadastrar);
router.get('/me', verifyToken, controller.obterAtual);
router.get('/users/:id', verifyToken, controller.obterPorId);
router.post('/profile', verifyToken, controller.salvarPerfil);
router.get('/profile', verifyToken, controller.obterPerfil);

module.exports = router;
