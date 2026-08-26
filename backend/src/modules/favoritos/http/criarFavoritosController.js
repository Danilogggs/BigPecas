const adaptar = (handler) => async (req, res, next) => {
  try { await handler(req, res); } catch (error) { next(error); }
};

function identidade(req) {
  return { user: req.user, authUser: req.authUser, usuario: req.usuario };
}

function criarFavoritosController(useCases) {
  return Object.freeze({
    listar: adaptar(async (req, res) => res.json(await useCases.listar(identidade(req)))),
    status: adaptar(async (req, res) => res.json(await useCases.status(identidade(req), req.params.pecaId))),
    adicionar: adaptar(async (req, res) => {
      const resultado = await useCases.adicionar(identidade(req), req.params.pecaId);
      res.status(resultado.status).json(resultado.data);
    }),
    remover: adaptar(async (req, res) => res.json(await useCases.remover(identidade(req), req.params.pecaId))),
  });
}

module.exports = criarFavoritosController;
