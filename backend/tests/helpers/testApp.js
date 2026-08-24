const express = require('express');

const errorHandler = require('../../src/middlewares/errorHandler');
const notFoundHandler = require('../../src/middlewares/notFoundHandler');

/**
 * Monta um app Express minimo com um unico router. A autenticacao e injetada
 * diretamente em `req`, do mesmo jeito que `verifyToken`/`verifyAdmin` fazem em
 * producao, para que os testes exercitem apenas o handler da rota.
 */
function buildTestApp(router, { user, admin, basePath = '/' } = {}) {
  const app = express();

  app.use(express.json());

  app.use((req, res, next) => {
    if (user) req.user = user;
    if (admin) req.admin = admin;
    next();
  });

  app.use(basePath, router);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { buildTestApp };
