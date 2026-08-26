const path = require('path');
const logger = require('../../utils/logger');
const criarFreteUseCases = require('./application/criarFreteUseCases');
const criarFreteController = require('./http/criarFreteController');
const criarMelhorEnvioGateway = require('./infrastructure/MelhorEnvioGateway');

const gateway = criarMelhorEnvioGateway({
  config: {
    baseUrl: process.env.MELHOR_ENVIO_URL || 'https://sandbox.melhorenvio.com.br',
    clientId: process.env.MELHOR_ENVIO_CLIENT_ID,
    clientSecret: process.env.MELHOR_ENVIO_CLIENT_SECRET,
    redirectUri: process.env.MELHOR_ENVIO_REDIRECT_URI,
    accessToken: process.env.MELHOR_ENVIO_ACCESS_TOKEN,
    refreshToken: process.env.MELHOR_ENVIO_REFRESH_TOKEN,
    userAgent: 'BigPecas (bernardo.jakubiak@gmail.com)',
  },
  envPath: path.resolve(__dirname, '../../../.env'),
  logger,
});
module.exports = criarFreteController(criarFreteUseCases({ gateway }));
