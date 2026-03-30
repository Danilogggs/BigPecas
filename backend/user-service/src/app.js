const express = require('express');
const cors = require('cors');

const userRoutes = require('./routes/userRoutes');
const errorHandler = require('./middlewares/errorHandler');
const notFoundHandler = require('./middlewares/notFoundHandler');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Serviço ativo'
  });
});

app.use('/users', userRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
