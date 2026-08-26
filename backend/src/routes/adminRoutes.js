const express = require('express');
const controller = require('../modules/admin/composition');

const router = express.Router();
router.get('/me', controller.me);
router.get('/preferencias', controller.preferencias);
router.put('/preferencias', controller.salvarPreferencias);
router.get('/dashboard', controller.dashboard);
router.get('/usuarios', controller.usuarios);
router.patch('/usuarios/:id/admin', controller.atualizarAdmin);
router.get('/pecas', controller.pecas);
router.delete('/pecas/:id', controller.removerPeca);
router.get('/pedidos', controller.pedidos);
router.patch('/pedidos/:id/status', controller.atualizarStatus);
router.get('/avaliacoes/:tipo', controller.avaliacoes);
router.delete('/avaliacoes/:tipo/:id', controller.removerAvaliacao);

module.exports = router;
