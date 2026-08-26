const adaptar = (handler) => async (req, res, next) => {
  try { await handler(req, res); } catch (error) { next(error); }
};

function criarNotificacoesController(useCases) {
  return Object.freeze({
    contar: adaptar(async (req, res) => res.json(await useCases.contar(req.user))),
    listar: adaptar(async (req, res) => res.json(await useCases.listar(req.user))),
    marcarComoLida: adaptar(async (req, res) => res.json(await useCases.marcarComoLida(req.user, req.params.id))),
  });
}

module.exports = criarNotificacoesController;
