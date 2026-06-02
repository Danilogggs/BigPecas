const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pecasRoutes = require('./routes/pecasRoutes');
const wishRoutes = require('./routes/wishRoutes');
const pedidosRoutes = require('./routes/pedidosRoutes');
const freteRoutes = require('./routes/freteRoutes');
const supabase = require('./config/db');
const verifyToken = require('./middlewares/verifyToken');
const errorHandler = require('./middlewares/errorHandler');
const notFoundHandler = require('./middlewares/notFoundHandler');

const app = express();
const PORT = process.env.PORT || 3002;
const CATEGORIAS_TABLE = process.env.SUPABASE_CATEGORIAS_TABLE || 'categorias';
const MATERIAIS_TABLE = process.env.SUPABASE_MATERIAIS_TABLE || 'materiais';

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  })
);

/**
 * Aumenta o limite do corpo da requisição para permitir envio de imagem em Base64.
 * Como a imagem é enviada no JSON dentro do campo "imagem", o payload fica maior.
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

async function seedTableIfEmpty(tableName, rows, label) {
  const { count, error: countError } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true });

  if (countError) {
    throw countError;
  }

  if (count === 0) {
    const { error: insertError } = await supabase
      .from(tableName)
      .insert(rows);

    if (insertError) {
      throw insertError;
    }

    console.log(`✅ ${label} inseridos no Supabase`);
  }
}

async function initializeDatabaseData() {
  try {
    console.log('📊 Verificando dados padrão no Supabase...');

    await seedTableIfEmpty(
      CATEGORIAS_TABLE,
      [
        { nome: 'Motor' },
        { nome: 'Lataria' },
        { nome: 'Elétrica' },
        { nome: 'Interior' },
        { nome: 'Suspensão' },
        { nome: 'Freios' },
      ],
      'Categorias padrão'
    );

    await seedTableIfEmpty(
      MATERIAIS_TABLE,
      [
        { nome: 'Aço' },
        { nome: 'Antimônio' },
        { nome: 'Baquelite' },
        { nome: 'Cromo' },
        { nome: 'Alumínio' },
        { nome: 'Borracha' },
      ],
      'Materiais padrão'
    );

    console.log('✅ Dados padrão do Supabase verificados com sucesso!');
  } catch (error) {
    console.error('⚠️ Não foi possível concluir a inicialização dos dados padrão:', error.message);
  }
}

app.get('/', (req, res) => {
  return res.send('Microserviço de Catálogo de Peças Online rodando com Supabase na Porta 3002');
});

app.get('/api/health', (req, res) => {
  return res.json({
    status: 'ok',
    message: 'microservice-DBpecas conectado ao Supabase.',
  });
});

app.use('/api/pecas', verifyToken, pecasRoutes);
app.use('/api/wish', verifyToken, wishRoutes);
app.use('/api/pedidos', verifyToken, pedidosRoutes);
app.use('/api/frete', verifyToken, freteRoutes);

app.get('/api/categorias', verifyToken, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from(CATEGORIAS_TABLE)
      .select('*')
      .order('nome', { ascending: true });

    if (error) {
      throw error;
    }

    return res.json(data || []);
  } catch (error) {
    return next(error);
  }
});

app.get('/api/materiais', verifyToken, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from(MATERIAIS_TABLE)
      .select('*')
      .order('nome', { ascending: true });

    if (error) {
      throw error;
    }

    return res.json(data || []);
  } catch (error) {
    return next(error);
  }
});

app.use(notFoundHandler);
app.use(errorHandler);

initializeDatabaseData().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor de Catálogo rodando em http://localhost:${PORT}`);
  });
});