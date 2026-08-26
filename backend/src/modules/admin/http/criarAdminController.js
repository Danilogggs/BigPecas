const adaptar = (handler) => async (req, res, next) => {
  try { await handler(req, res); } catch (error) { next(error); }
};

function criarAdminController(useCases) {
  return Object.freeze({
    me: (req, res) => res.json({ admin: req.admin }),
    preferencias: adaptar(async (req, res) => res.json(await useCases.obterPreferencias(req.admin))),
    salvarPreferencias: adaptar(async (req, res) => res.json(await useCases.salvarPreferencias(req.admin, req.body))),
    dashboard: adaptar(async (_req, res) => res.json(await useCases.obterDashboard())),
    usuarios: adaptar(async (req, res) => res.json(await useCases.listarUsuarios(req.query))),
    atualizarAdmin: adaptar(async (req, res) => res.json(await useCases.atualizarAdmin(req.params.id, req.body?.is_admin))),
    pecas: adaptar(async (req, res) => res.json(await useCases.listarPecas(req.query))),
    removerPeca: adaptar(async (req, res) => res.json(await useCases.removerPeca(req.params.id))),
    pedidos: adaptar(async (req, res) => res.json(await useCases.listarPedidos(req.query))),
    atualizarStatus: adaptar(async (req, res) => res.json(await useCases.atualizarStatus({
      id: req.params.id, status: req.body?.status, admin: req.admin,
    }))),
    avaliacoes: adaptar(async (req, res) => res.json(await useCases.listarAvaliacoes(req.params.tipo, req.query))),
    removerAvaliacao: adaptar(async (req, res) => res.json(await useCases.removerAvaliacao(req.params.tipo, req.params.id))),
  });
}

module.exports = criarAdminController;
