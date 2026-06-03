require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/authRoutes');
const errorHandler = require('./middlewares/errorHandler');
const notFoundHandler = require('./middlewares/notFoundHandler');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3001;

// Segurança: headers HTTP
app.use(helmet());

// CORS
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));

// Rate limiting global: 200 req/min por IP
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Aguarde um momento e tente novamente.' },
}));

// Rate limiting específico para auth: 20 req/min por IP (brute-force)
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de autenticação. Aguarde um momento e tente novamente.' },
});

app.use(express.json());

app.use('/api/auth', authLimiter, authRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`microservice-auth rodando na porta ${PORT}`);
});
