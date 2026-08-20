const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/authRoutes');
const catalogRoutes = require('./routes/catalogRoutes');
const freteRoutes = require('./routes/freteRoutes');
const pecasRoutes = require('./routes/pecasRoutes');
const pedidosRoutes = require('./routes/pedidosRoutes');
const avaliacoesRoutes = require('./routes/avaliacoesRoutes');
const wishRoutes = require('./routes/wishRoutes');
const adminRoutes = require('./routes/adminRoutes');
const errorHandler = require('./middlewares/errorHandler');
const notFoundHandler = require('./middlewares/notFoundHandler');
const verifyToken = require('./middlewares/verifyToken');
const verifyAdmin = require('./middlewares/verifyAdmin');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));

app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 250,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisicoes. Aguarde um momento e tente novamente.' },
}));

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de autenticacao. Aguarde um momento e tente novamente.' },
});

const freteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Limite de calculos de frete atingido. Aguarde um momento.' },
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/', (req, res) => {
  return res.json({ name: 'BigPecas API', status: 'running' });
});

app.get('/api/health', (req, res) => {
  return res.json({ status: 'ok', message: 'BigPecas API conectada ao Supabase.' });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/pecas', verifyToken, pecasRoutes);
app.use('/api/wish', verifyToken, wishRoutes);
app.use('/api/pedidos', verifyToken, pedidosRoutes);
app.use('/api/avaliacoes', verifyToken, avaliacoesRoutes);
app.use('/api/frete', verifyToken, freteLimiter, freteRoutes);
app.use('/api/admin', verifyToken, verifyAdmin, adminRoutes);
app.use('/api', verifyToken, catalogRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
