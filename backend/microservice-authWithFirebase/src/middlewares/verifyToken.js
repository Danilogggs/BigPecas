const admin = require('../config/firebaseAdmin');
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
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = verifyToken;
