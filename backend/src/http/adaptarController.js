/**
 * Adapter compartilhado entre controllers HTTP e casos de uso.
 *
 * Os casos de uso podem permanecer agnosticos ao Express: este adaptador e o
 * unico responsavel por encaminhar rejeicoes assincronas ao error handler.
 */
function adaptarController(handler) {
  if (typeof handler !== 'function') {
    throw new TypeError('O handler do controller deve ser uma funcao.');
  }

  return async function controllerExpress(req, res, next) {
    try {
      await handler(req, res);
    } catch (error) {
      next(error);
    }
  };
}

module.exports = adaptarController;
