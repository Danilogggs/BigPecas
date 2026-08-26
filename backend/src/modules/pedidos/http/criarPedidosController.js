function adaptar(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res);
    } catch (error) {
      next(error);
    }
  };
}

function criarPedidosController(useCases) {
  return Object.freeze({
    historico: adaptar(async (req, res) => {
      res.json(await useCases.obterHistorico(req.user));
    }),

    listar: adaptar(async (req, res) => {
      res.json(await useCases.listarCompras(req.user));
    }),

    detalhar: adaptar(async (req, res) => {
      res.json(await useCases.obterPedido({
        identidade: req.user,
        id: req.params.id,
        visao: req.query.visao,
      }));
    }),

    criar: adaptar(async (req, res) => {
      const pedido = await useCases.criarPedido({ identidade: req.user, dados: req.body });
      res.status(201).json(pedido);
    }),

    atualizarStatus: adaptar(async (req, res) => {
      res.json(await useCases.atualizarStatus({
        identidade: req.user,
        id: req.params.id,
        status: req.body.status,
      }));
    }),
  });
}

module.exports = criarPedidosController;
