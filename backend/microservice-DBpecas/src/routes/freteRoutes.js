const express = require('express');
const router = express.Router();
const AppError = require('../utils/AppError');

const ME_BASE_URL = process.env.MELHOR_ENVIO_URL || 'https://sandbox.melhorenvio.com.br';
const CLIENT_ID = process.env.MELHOR_ENVIO_CLIENT_ID;
const CLIENT_SECRET = process.env.MELHOR_ENVIO_CLIENT_SECRET;
const REDIRECT_URI = process.env.MELHOR_ENVIO_REDIRECT_URI;
const USER_AGENT = 'BigPecas (bernardo.jakubiak@gmail.com)';

// Tokens em memória — atualizados pelo refresh automático
let currentTokens = {
  access_token: process.env.MELHOR_ENVIO_ACCESS_TOKEN || '',
  refresh_token: process.env.MELHOR_ENVIO_REFRESH_TOKEN || '',
};

const melhorEnvioHeaders = () => ({
  'Content-Type': 'application/json',
  Accept: 'application/json',
  Authorization: `Bearer ${currentTokens.access_token}`,
  'User-Agent': USER_AGENT,
});

async function refreshAccessToken() {
  const response = await fetch(`${ME_BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': USER_AGENT },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      refresh_token: currentTokens.refresh_token,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new AppError(502, `Falha ao renovar token do Melhor Envio: ${body}`);
  }

  const data = await response.json();
  currentTokens.access_token = data.access_token;
  currentTokens.refresh_token = data.refresh_token;
  console.log('✅ Token do Melhor Envio renovado com sucesso.');
  return data;
}

async function calcularComRetry(payload) {
  let response = await fetch(`${ME_BASE_URL}/api/v2/me/shipment/calculate`, {
    method: 'POST',
    headers: melhorEnvioHeaders(),
    body: JSON.stringify(payload),
  });

  if (response.status === 401) {
    console.log('🔄 Token expirado. Renovando...');
    await refreshAccessToken();
    response = await fetch(`${ME_BASE_URL}/api/v2/me/shipment/calculate`, {
      method: 'POST',
      headers: melhorEnvioHeaders(),
      body: JSON.stringify(payload),
    });
  }

  return response;
}

// POST /api/frete/calcular
// Body: { cep_origem, cep_destino, produtos: [{ peso_gramas, comprimento_mm, largura_mm, altura_mm, preco, quantidade }] }
router.post('/calcular', async (req, res, next) => {
  try {
    const { cep_origem, cep_destino, produtos } = req.body;

    if (!cep_origem || !/^\d{8}$/.test(String(cep_origem).replace(/\D/g, ''))) {
      throw new AppError(400, 'CEP de origem inválido.');
    }

    if (!cep_destino || !/^\d{8}$/.test(String(cep_destino).replace(/\D/g, ''))) {
      throw new AppError(400, 'CEP de destino inválido.');
    }

    if (!Array.isArray(produtos) || produtos.length === 0) {
      throw new AppError(400, 'Informe ao menos um produto para calcular o frete.');
    }

    // Extrai apenas dígitos e ponto de qualquer valor — protege contra "2kg", "10cm", etc.
    const toNum = (v, fallback = 0) => {
      const n = parseFloat(String(v ?? '').replace(/[^\d.]/g, ''));
      return isNaN(n) ? fallback : n;
    };

    const productsPayload = produtos.map((p, i) => ({
      id: String(p.id || i + 1),
      width:            Math.max(1, Math.round(toNum(p.largura_mm,    150) / 10)),
      height:           Math.max(1, Math.round(toNum(p.altura_mm,     100) / 10)),
      length:           Math.max(1, Math.round(toNum(p.comprimento_mm,200) / 10)),
      weight:           Math.max(0.1, toNum(p.peso_gramas, 500) / 1000),
      insurance_value:  Math.max(1,   toNum(p.preco, 100)),
      quantity:         Math.max(1,   Math.round(toNum(p.quantidade, 1))),
    }));

    const payload = {
      from: { postal_code: String(cep_origem).replace(/\D/g, '') },
      to: { postal_code: String(cep_destino).replace(/\D/g, '') },
      products: productsPayload,
    };

    const response = await calcularComRetry(payload);
    const data = await response.json();

    if (!response.ok) {
      const mensagem = data?.message || data?.error || 'Erro ao calcular frete no Melhor Envio.';
      throw new AppError(response.status, mensagem);
    }

    // Filtra somente opções com preço disponível e normaliza resposta
    const opcoes = Array.isArray(data)
      ? data
          .filter((op) => op.price && !op.error)
          .map((op) => ({
            id: op.id,
            transportadora: op.company?.name || op.name,
            tipo: op.name,
            logo: op.company?.picture || null,
            valor: Number(op.custom_price || op.price),
            prazo_min: op.custom_delivery_range?.min ?? op.delivery_range?.min ?? op.delivery_time,
            prazo_max: op.custom_delivery_range?.max ?? op.delivery_range?.max ?? op.delivery_time,
            prazo_dias: op.custom_delivery_time || op.delivery_time,
            prazo_texto:
              (op.custom_delivery_range?.min ?? op.delivery_time) === 1
                ? 'Entrega em 1 dia útil'
                : `Entrega em até ${op.custom_delivery_range?.max ?? op.delivery_time} dias úteis`,
            desconto: Number(op.discount || 0),
          }))
          .sort((a, b) => a.valor - b.valor)
      : [];

    return res.json({ opcoes, cep_destino: String(cep_destino).replace(/\D/g, '') });
  } catch (error) {
    return next(error);
  }
});

// POST /api/frete/refresh — força renovação manual do token (uso interno/debug)
router.post('/refresh', async (req, res, next) => {
  try {
    const data = await refreshAccessToken();
    return res.json({ message: 'Token renovado com sucesso.', expires_in: data.expires_in });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
