require('dotenv').config();

const app = require('./app');
const initializeDatabaseData = require('./services/initializeDatabaseData');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3001;

async function startServer() {
  await initializeDatabaseData();

  app.listen(PORT, () => {
    logger.info(`BigPecas backend rodando na porta ${PORT}`);
  });
}

startServer().catch((error) => {
  logger.error('Nao foi possivel iniciar o backend', {
    error: error.message,
    stack: error.stack,
  });
  process.exitCode = 1;
});
