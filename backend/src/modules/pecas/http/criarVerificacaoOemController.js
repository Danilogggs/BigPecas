function criarVerificacaoOemController({ autoPartsService, validarENormalizarOem }) {
  return async function verificarOem(req, res, next) {
    try {
      const oem = validarENormalizarOem(req.query.oem);
      res.json(await autoPartsService.verificarOem(oem));
    } catch (error) {
      next(error);
    }
  };
}

module.exports = criarVerificacaoOemController;
