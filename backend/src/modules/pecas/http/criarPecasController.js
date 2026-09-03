function adaptar(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res);
    } catch (error) {
      next(error);
    }
  };
}

function obterIdentidade(req) {
  return {
    email: req.user?.email || req.user?.user?.email || req.authUser?.email || req.usuario?.email,
  };
}

function criarPecasController(useCases) {
  return Object.freeze({
    cadastrar: adaptar(async (req, res) => {
      const resultado = await useCases.cadastrar({
        identidade: obterIdentidade(req),
        usuarioAutenticado: req.user,
        dados: req.body,
      });
      res.status(201).json(resultado);
    }),

    listar: adaptar(async (req, res) => {
      const resultado = await useCases.listar({
        identidade: obterIdentidade(req),
        query: req.query,
      });
      res.set('X-Total-Count', String(resultado.total));
      res.set('X-Page', String(resultado.paginacao.pagina));
      res.set('X-Page-Size', String(resultado.paginacao.tamanho));
      res.set('Access-Control-Expose-Headers', 'X-Total-Count, X-Page, X-Page-Size');
      res.json(resultado.itens);
    }),

    fornecedoresRecomendados: adaptar(async (req, res) => {
      res.json(await useCases.listarFornecedoresRecomendados(req.query.limite));
    }),

    perfilFornecedor: adaptar(async (req, res) => {
      res.json(await useCases.obterPerfilFornecedor(req.params.id));
    }),

    recomendacoes: adaptar(async (req, res) => {
      res.json(await useCases.recomendar(req.params.id, req.query.limite));
    }),

    recomendacoesHistorico: adaptar(async (req, res) => {
      res.json(await useCases.recomendarPorHistorico(obterIdentidade(req), req.query.limite));
    }),

    detalhar: adaptar(async (req, res) => {
      res.json(await useCases.detalhar(req.params.id, obterIdentidade(req)));
    }),

    atualizar: adaptar(async (req, res) => {
      res.json(await useCases.atualizar({
        identidade: obterIdentidade(req),
        id: req.params.id,
        dados: req.body,
      }));
    }),

    deletar: adaptar(async (req, res) => {
      res.json(await useCases.deletar({
        identidade: obterIdentidade(req),
        id: req.params.id,
      }));
    }),

    categorias: adaptar(async (_req, res) => {
      res.json(await useCases.listarCategorias());
    }),

    materiais: adaptar(async (_req, res) => {
      res.json(await useCases.listarMateriais());
    }),
  });
}

module.exports = criarPecasController;
