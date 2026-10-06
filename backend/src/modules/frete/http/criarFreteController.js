const adaptar = require('../../../http/adaptarController');

function criarFreteController(useCases) {
  return Object.freeze({
    calcular: adaptar(async (req, res) => res.json(await useCases.calcular(req.body))),
    renovar: adaptar(async (_req, res) => res.json(await useCases.renovar())),
  });
}

module.exports = criarFreteController;
