const supabase = require('../config/db');
const AppError = require('../utils/AppError');

async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError(401, 'Você precisa estar autenticado para realizar esta ação.'));
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return next(new AppError(401, 'Você precisa estar autenticado para realizar esta ação.'));
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return next(new AppError(401, 'Sua autenticação não pôde ser validada. Faça login novamente.'));
    }

    req.user = data.user;
    req.accessToken = token;

    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = verifyToken;
