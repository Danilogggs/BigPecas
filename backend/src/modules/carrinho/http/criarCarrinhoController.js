const adaptar = require('../../../http/adaptarController');

function identidade(req) {
  return { user: req.user, authUser: req.authUser, usuario: req.usuario };
}

function criarCarrinhoController(useCases) {
  return Object.freeze({
    obter: adaptar(async (req, res) => res.json(await useCases.obter(identidade(req)))),
    salvar: adaptar(async (req, res) => res.json(await useCases.salvar(identidade(req), req.body?.itens))),
  });
}

module.exports = criarCarrinhoController;
