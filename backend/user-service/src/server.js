require('dotenv').config();
const app = require('./app');
const { testConnection } = require('./config/db');

const PORT = Number(process.env.PORT) || 3001;

async function bootstrap() {
  try {
    await testConnection();

    app.listen(PORT, () => {
      console.log(`User-service rodando na porta ${PORT}`);
    });
  } catch (error) {
    console.error('Falha ao iniciar a aplicação:', error.message);
    process.exit(1);
  }
}

bootstrap();
