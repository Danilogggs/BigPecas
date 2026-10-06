const adaptar = require('../../../http/adaptarController');

function criarVerificacaoOemController({ autoPartsService, validarENormalizarOem }) {
  return adaptar(async function verificarOem(req, res) {
    const oem = validarENormalizarOem(req.query.oem);
    res.json(await autoPartsService.verificarOem(oem));
  });
}

module.exports = criarVerificacaoOemController;
