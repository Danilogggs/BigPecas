const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pecasRoutes = require('./routes/pecasRoutes');
const db = require('./config/db');

const app = express();

// Middlewares
app.use(cors()); // Permite que o seu React (Vite) acesse esta API
app.use(express.json());

// Função para inicializar dados padrão
async function initializeDatabaseData() {
  try {
    console.log('📊 Verificando dados das tabelas...');
    
    // Verifica se categorias estão vazias
    const [categorias] = await db.execute('SELECT COUNT(*) as count FROM categorias');
    if (categorias[0].count === 0) {
      console.log('📥 Inserindo categorias padrão...');
      await db.execute("INSERT INTO categorias (nome) VALUES ('Motor'), ('Lataria'), ('Elétrica'), ('Interior'), ('Suspensão'), ('Freios')");
      console.log('✅ Categorias inseridas');
    }

    // Verifica se materiais estão vazios
    const [materiais] = await db.execute('SELECT COUNT(*) as count FROM materiais');
    if (materiais[0].count === 0) {
      console.log('📥 Inserindo materiais padrão...');
      await db.execute("INSERT INTO materiais (nome) VALUES ('Aço'), ('Antimônio'), ('Baquelite'), ('Cromo'), ('Alumínio'), ('Borracha')");
      console.log('✅ Materiais inseridos');
    }

    console.log('✅ Banco de dados inicializado com sucesso!');
  } catch (error) {
    console.error('⚠️ Erro ao inicializar dados:', error.message);
  }
}

// rota do micro
app.use('/api/pecas', pecasRoutes);

// teste health
app.get('/', (req, res) => {
  res.send('Microserviço de Catálogo de Peças Online na Porta 3002');
});

// Rota para listar categorias
app.get('/api/categorias', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM categorias');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rota para listar materiais
app.get('/api/materiais', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM materiais');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3002;

// Inicializa dados e depois inicia o servidor
initializeDatabaseData().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor de Catálogo rodando em http://localhost:${PORT}`);
  });
}).catch(error => {
  console.error('❌ Erro ao inicializar servidor:', error);
  process.exit(1);
});
