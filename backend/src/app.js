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
const auditRoutes = require('./routes/auditRoutes');
const auditEventRoutes = require('./routes/auditEventRoutes');
const errorHandler = require('./middlewares/errorHandler');
const notFoundHandler = require('./middlewares/notFoundHandler');
const verifyToken = require('./middlewares/verifyToken');
const verifyAdmin = require('./middlewares/verifyAdmin');
const auditBackendActions = require('./middlewares/auditBackendActions');
const {
  apiLimiter,
  authLimiter,
  registroLimiter,
  freteLimiter,
  configurarConfiancaNoProxy,
} = require('./middlewares/rateLimiter');

const app = express();
app.use(require('./middlewares/requestTelemetry'));

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
  return res.json({ status: 'ok', message: 'BigPecas API em execução.' });
});

app.use('/api/auth/register', registroLimiter);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/pecas', verifyToken, auditBackendActions, pecasRoutes);
app.use('/api/wish', verifyToken, auditBackendActions, wishRoutes);
app.use('/api/pedidos', verifyToken, auditBackendActions, pedidosRoutes);
app.use('/api/notificacoes', notificacoesRoutes);
app.use('/api/auditoria', verifyToken, auditEventRoutes);
app.use('/api/admin/auditoria', verifyToken, verifyAdmin, auditRoutes);
app.use('/api/avaliacoes', verifyToken, auditBackendActions, avaliacoesRoutes);
app.use('/api/frete', verifyToken, auditBackendActions, freteLimiter, freteRoutes);
app.use('/api/avaliador', verifyToken, auditBackendActions, avaliadorRoutes);
app.use('/api/admin/avaliador', verifyToken, verifyAdmin, auditBackendActions, adminAvaliadorRoutes);
app.use('/api/admin', verifyToken, verifyAdmin, auditBackendActions, adminRoutes);
app.use('/api/moeda', currencyRoutes);
app.use('/api', verifyToken, auditBackendActions, catalogRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
