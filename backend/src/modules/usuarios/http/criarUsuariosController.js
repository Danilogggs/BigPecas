function adaptar(handler) {
  return async (req, res, next) => {
    try { await handler(req, res); } catch (error) { next(error); }
  };
}

function criarUsuariosController(useCases) {
  return Object.freeze({
    health: (_req, res) => res.json({
      status: 'ok',
      message: 'API de autenticação do BigPeças funcionando com Supabase.',
    }),
    cadastrar: adaptar(async (req, res) => res.status(201).json(await useCases.cadastrar(req.body))),
    obterAtual: adaptar(async (req, res) => res.json(await useCases.obterUsuarioAtual(req.user))),
    obterPorId: adaptar(async (req, res) => res.json(await useCases.obterUsuarioPorId(req.params.id))),
    salvarPerfil: adaptar(async (req, res) => {
      const resultado = await useCases.salvarPerfil({ authUser: req.user, dados: req.body });
      res.status(resultado.status).json(resultado.data);
    }),
    obterPerfil: adaptar(async (req, res) => res.json(await useCases.obterPerfil(req.user))),
  });
}

module.exports = criarUsuariosController;
