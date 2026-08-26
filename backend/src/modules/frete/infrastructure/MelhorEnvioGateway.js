const fs = require('fs');
const AppError = require('../../../utils/AppError');

function criarMelhorEnvioGateway({ config, envPath, logger }) {
  const tokens = { access_token: config.accessToken || '', refresh_token: config.refreshToken || '' };
  const headers = () => ({
    'Content-Type': 'application/json', Accept: 'application/json',
    Authorization: `Bearer ${tokens.access_token}`, 'User-Agent': config.userAgent,
  });

  function persistirTokens(accessToken, refreshToken) {
    try {
      if (!fs.existsSync(envPath)) return;
      const conteudo = fs.readFileSync(envPath, 'utf8')
        .replace(/^MELHOR_ENVIO_ACCESS_TOKEN=.*/m, `MELHOR_ENVIO_ACCESS_TOKEN=${accessToken}`)
        .replace(/^MELHOR_ENVIO_REFRESH_TOKEN=.*/m, `MELHOR_ENVIO_REFRESH_TOKEN=${refreshToken}`);
      fs.writeFileSync(envPath, conteudo, 'utf8');
      logger.info('Tokens do Melhor Envio persistidos no .env');
    } catch (error) {
      logger.warn('Não foi possível persistir tokens no .env', { error: error.message });
    }
  }

  async function renovarToken() {
    const response = await fetch(`${config.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': config.userAgent },
      body: JSON.stringify({
        grant_type: 'refresh_token', client_id: config.clientId,
        client_secret: config.clientSecret, redirect_uri: config.redirectUri,
        refresh_token: tokens.refresh_token,
      }),
    });
    if (!response.ok) throw new AppError(502, `Falha ao renovar token do Melhor Envio: ${await response.text()}`);
    const data = await response.json();
    tokens.access_token = data.access_token;
    tokens.refresh_token = data.refresh_token;
    persistirTokens(data.access_token, data.refresh_token);
    logger.info('Token do Melhor Envio renovado com sucesso');
    return data;
  }

  async function calcular(payload) {
    const executar = () => fetch(`${config.baseUrl}/api/v2/me/shipment/calculate`, {
      method: 'POST', headers: headers(), body: JSON.stringify(payload),
    });
    let response = await executar();
    if (response.status === 401) {
      console.log('🔄 Token expirado. Renovando...');
      await renovarToken();
      response = await executar();
    }
    return response;
  }

  return Object.freeze({ calcular, renovarToken });
}

module.exports = criarMelhorEnvioGateway;
