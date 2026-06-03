const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const pecasRoutes = require('./routes/pecasRoutes');
const wishRoutes = require('./routes/wishRoutes');
const pedidosRoutes = require('./routes/pedidosRoutes');
const freteRoutes = require('./routes/freteRoutes');
const supabase = require('./config/db');
const verifyToken = require('./middlewares/verifyToken');
const errorHandler = require('./middlewares/errorHandler');
const notFoundHandler = require('./middlewares/notFoundHandler');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3002;
const CATEGORIAS_TABLE = process.env.SUPABASE_CATEGORIAS_TABLE || 'categorias';
const MATERIAIS_TABLE = process.env.SUPABASE_MATERIAIS_TABLE || 'materiais';

// Segurança: headers HTTP
app.use(helmet());

// CORS
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));

// Rate limiting global: 250 req/min por IP
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 250,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Aguarde um momento e tente novamente.' },
}));

// Rate limiting para frete: 30 req/min (protege cota do Melhor Envio)
const freteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Limite de cálculos de frete atingido. Aguarde um momento.' },
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

async function seedTableIfEmpty(tableName, rows, label) {
  const { count, error: countError } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true });

  if (countError) throw countError;

  if (count === 0) {
    const { error: insertError } = await supabase.from(tableName).insert(rows);
    if (insertError) throw insertError;
    logger.info(`${label} inseridos no Supabase`);
  }
}

async function initializeDatabaseData() {
  try {
    logger.info('Verificando dados padrão no Supabase...');

    await seedTableIfEmpty(CATEGORIAS_TABLE, [
      { nome: 'Motor' }, { nome: 'Lataria' }, { nome: 'Elétrica' },
      { nome: 'Interior' }, { nome: 'Suspensão' }, { nome: 'Freios' },
    ], 'Categorias padrão');

    await seedTableIfEmpty(MATERIAIS_TABLE, [
      { nome: 'Aço' }, { nome: 'Antimônio' }, { nome: 'Baquelite' },
      { nome: 'Cromo' }, { nome: 'Alumínio' }, { nome: 'Borracha' },
    ], 'Materiais padrão');

    logger.info('Dados padrão do Supabase verificados com sucesso');
  } catch (error) {
    logger.warn('Não foi possível inicializar dados padrão', { error: error.message });
  }
}

app.get('/', (req, res) =>
  res.json({ name: 'BigPeças - microservice-DBpecas', status: 'running' })
);

app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', message: 'microservice-DBpecas conectado ao Supabase.' })
);

app.use('/api/pecas', verifyToken, pecasRoutes);
app.use('/api/wish', verifyToken, wishRoutes);
app.use('/api/pedidos', verifyToken, pedidosRoutes);
app.use('/api/frete', verifyToken, freteLimiter, freteRoutes);

app.get('/api/categorias', verifyToken, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from(CATEGORIAS_TABLE)
      .select('*')
      .order('nome', { ascending: true });
    if (error) throw error;
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
    if (error) throw error;
    return res.json(data || []);
  } catch (error) {
    return next(error);
  }
});

app.use(notFoundHandler);
app.use(errorHandler);

initializeDatabaseData().then(() => {
  app.listen(PORT, () => {
    logger.info(`microservice-DBpecas rodando na porta ${PORT}`);
  });
});
