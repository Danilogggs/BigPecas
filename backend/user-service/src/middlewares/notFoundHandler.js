const ApiError = require('../utils/ApiError');

function notFoundHandler(req, res, next) {
  next(new ApiError(404, 'Rota não encontrada.'));
}

module.exports = notFoundHandler;
