const AppError = require('../../../utils/AppError');

function obterEmailAutenticado(usuario) {
  const email = usuario?.email || null;
  if (!email) throw new AppError(401, 'Não foi possível identificar o usuário autenticado.');
  return email;
}

module.exports = { obterEmailAutenticado };
