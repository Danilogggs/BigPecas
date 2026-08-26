const express = require('express');
const controller = require('../modules/frete/composition');

const router = express.Router();
router.post('/calcular', controller.calcular);
router.post('/refresh', controller.renovar);

module.exports = router;
