const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pecasRoutes = require('./routes/pecasRoutes');
const db = require('./config/db');
const errorHandler = require('./middlewares/errorHandler');
const notFoundHandler = require('./middlewares/notFoundHandler');

const app = express();

app.use(cors());
app.use(express.json());

async function initializeDatabaseData() {
  try {
    console.log('📊 Verificando dados das tabelas...');

    const [categorias] = await db.execute('SELECT COUNT(*) as count FROM categorias');
    if (categorias[0].count === 0) {
      console.log('📥 Inserindo categorias padrão...');
      await db.execute("INSERT INTO categorias (nome) VALUES ('Motor'), ('Lataria'), ('Elétrica'), ('Interior'), ('Suspensão'), ('Freios')");
      console.log('✅ Categorias inseridas');
    }

    const [materiais] = await db.execute('SELECT COUNT(*) as count FROM materiais');
    if (materiais[0].count === 0) {
      console.log('📥 Inserindo materiais padrão...');
      await db.execute("INSERT INTO materiais (nome) VALUES ('Aço'), ('Antimônio'), ('Baquelite'), ('Cromo'), ('Alumínio'), ('Borracha')");
      console.log('✅ Materiais inseridos');
    }

    console.log('✅ Banco de dados inicializado com sucesso!');
  } catch (error) {
    console.error('⚠️ Não foi possível concluir a inicialização dos dados padrão:', error.message);
  }
}

app.use('/api/pecas', pecasRoutes);

app.get('/', (req, res) => {
  return res.send('Microserviço de Catálogo de Peças Online na Porta 3002');
});

app.get('/api/categorias', async (req, res, next) => {
  try {
    const [rows] = await db.execute('SELECT * FROM categorias');
    return res.json(rows);
  } catch (error) {
    return next(error);
  }
});

app.get('/api/materiais', async (req, res, next) => {
  try {
    const [rows] = await db.execute('SELECT * FROM materiais');
    return res.json(rows);
  } catch (error) {
    return next(error);
  }
});

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 3002;

initializeDatabaseData()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Servidor de Catálogo rodando em http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ Erro ao inicializar servidor:', error.message);
    process.exit(1);
  });
