const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./routes/authRoutes');
const catalogRoutes = require('./routes/catalogRoutes');
const freteRoutes = require('./routes/freteRoutes');
const pecasRoutes = require('./routes/pecasRoutes');
const pedidosRoutes = require('./routes/pedidosRoutes');
const avaliacoesRoutes = require('./routes/avaliacoesRoutes');
const wishRoutes = require('./routes/wishRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificacoesRoutes = require('./routes/notificacoesRoutes');
const avaliadorRoutes = require('./routes/avaliadorRoutes');
const adminAvaliadorRoutes = require('./routes/adminAvaliadorRoutes');
const currencyRoutes = require('./routes/currencyRoutes');
const errorHandler = require('./middlewares/errorHandler');
const notFoundHandler = require('./middlewares/notFoundHandler');
const verifyToken = require('./middlewares/verifyToken');
const verifyAdmin = require('./middlewares/verifyAdmin');
const {
  apiLimiter,
  authLimiter,
  registroLimiter,
  freteLimiter,
  configurarConfiancaNoProxy,
} = require('./middlewares/rateLimiter');

const app = express();

configurarConfiancaNoProxy(app);

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));

// Antes do parser de corpo: requisicao bloqueada nao gasta CPU lendo o payload.
app.use(apiLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/', (req, res) => {
  return res.json({ name: 'BigPecas API', status: 'running' });
});

app.get('/api/health', (req, res) => {
  return res.json({ status: 'ok', message: 'BigPecas API conectada ao Supabase.' });
});

app.use('/api/auth/register', registroLimiter);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/pecas', verifyToken, pecasRoutes);
app.use('/api/wish', verifyToken, wishRoutes);
app.use('/api/pedidos', verifyToken, pedidosRoutes);
app.use('/api/notificacoes', notificacoesRoutes);
app.use('/api/avaliacoes', verifyToken, avaliacoesRoutes);
app.use('/api/frete', verifyToken, freteLimiter, freteRoutes);
app.use('/api/avaliador', verifyToken, avaliadorRoutes);
app.use('/api/admin', verifyToken, verifyAdmin, adminRoutes);
app.use('/api/admin/avaliador', verifyToken, verifyAdmin, adminAvaliadorRoutes);
app.use('/api/moeda', currencyRoutes);
app.use('/api', verifyToken, catalogRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
