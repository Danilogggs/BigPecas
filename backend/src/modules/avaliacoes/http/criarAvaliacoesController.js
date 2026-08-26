const adaptar = (handler) => async (req, res, next) => {
  try { await handler(req, res); } catch (error) { next(error); }
};

function criarAvaliacoesController(useCases) {
  return Object.freeze({
    estado: adaptar(async (req, res) => res.json(await useCases.obterEstado(req.user, req.params.pedidoId))),
    avaliarFornecedor: adaptar(async (req, res) => res.status(201).json(await useCases.avaliarFornecedor(req.user, req.body))),
    avaliarProduto: adaptar(async (req, res) => res.status(201).json(await useCases.avaliarProduto(req.user, req.body))),
    fornecedor: adaptar(async (req, res) => res.json(await useCases.listarFornecedor(req.params.fornecedorId))),
    produto: adaptar(async (req, res) => res.json(await useCases.listarProduto(req.params.pecaId))),
  });
}

module.exports = criarAvaliacoesController;
