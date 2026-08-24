const rateLimit = require('express-rate-limit');

const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

const UM_MINUTO = 60 * 1000;
const QUINZE_MINUTOS = 15 * UM_MINUTO;

function inteiroPositivo(valor, padrao) {
  const numero = Number.parseInt(valor, 10);
  return Number.isInteger(numero) && numero > 0 ? numero : padrao;
}

const RATE_LIMIT_ATIVO = String(process.env.RATE_LIMIT_ENABLED ?? 'true') === 'true';

/**
 * Traduz TRUST_PROXY para o formato aceito por `app.set('trust proxy', ...)`.
 *
 * Vazio/false  -> nao confia em nenhum proxy (padrao seguro)
 * Numero       -> confia nos N proxies mais proximos da aplicacao
 * Lista de IPs -> confia somente nesses enderecos/faixas
 * true         -> confia em qualquer origem (permite burlar o limite)
 */
function resolverTrustProxy(valor) {
  const bruto = String(valor ?? '').trim();

  if (!bruto || bruto.toLowerCase() === 'false') return false;
  if (bruto.toLowerCase() === 'true') return true;
  if (/^\d+$/.test(bruto)) return Number(bruto);

  const enderecos = bruto.split(',').map((item) => item.trim()).filter(Boolean);
  return enderecos.length === 1 ? enderecos[0] : enderecos;
}

/**
 * Define em quem o Express pode confiar para descobrir o IP real do cliente.
 *
 * Sem isso, atras de um proxy todas as requisicoes chegam com o IP do proxy e
 * um unico cliente consumiria o limite de todo mundo. Por outro lado, confiar
 * em qualquer X-Forwarded-For deixa o limite trivial de burlar, entao o padrao
 * e nao confiar em ninguem.
 */
function configurarConfiancaNoProxy(app) {
  const trustProxy = resolverTrustProxy(process.env.TRUST_PROXY);

  if (trustProxy === true) {
    logger.warn(
      'TRUST_PROXY=true aceita qualquer X-Forwarded-For e permite burlar o rate limit. ' +
      'Prefira informar a quantidade de proxies (ex.: TRUST_PROXY=1) ou os IPs confiaveis.',
    );
  }

  app.set('trust proxy', trustProxy);

  return trustProxy;
}

/**
 * Cria um limitador que devolve o erro pelo `next`, e nao direto na resposta,
 * para que o 429 passe pelo errorHandler e saia no mesmo formato `{ error }`
 * dos demais erros da API.
 */
function criarRateLimiter({ nome, windowMs, limit, message, skip }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req, res) => !RATE_LIMIT_ATIVO || Boolean(skip?.(req, res)),
    handler: (req, res, next) => {
      logger.warn('Limite de requisicoes atingido', {
        limitador: nome,
        method: req.method,
        path: req.originalUrl,
        ip: req.ip,
      });

      return next(new AppError(429, message));
    },
  });
}

// O healthcheck do container bate nesta rota de forma continua; bloquea-lo faria
// o orquestrador considerar a API fora do ar.
const apiLimiter = criarRateLimiter({
  nome: 'api',
  windowMs: inteiroPositivo(process.env.RATE_LIMIT_WINDOW_MS, UM_MINUTO),
  limit: inteiroPositivo(process.env.RATE_LIMIT_MAX, 250),
  message: 'Muitas requisicoes. Aguarde um momento e tente novamente.',
  skip: (req) => req.path === '/api/health',
});

// `/register` fica de fora porque tem limite proprio, bem mais restrito. Com os
// dois ativos a cota valeria em dobro e os cabecalhos RateLimit-* anunciariam ao
// cliente o limite mais frouxo dos dois.
const authLimiter = criarRateLimiter({
  nome: 'auth',
  windowMs: inteiroPositivo(process.env.RATE_LIMIT_AUTH_WINDOW_MS, UM_MINUTO),
  limit: inteiroPositivo(process.env.RATE_LIMIT_AUTH_MAX, 20),
  message: 'Muitas tentativas de autenticacao. Aguarde um momento e tente novamente.',
  skip: (req) => req.path === '/register',
});

// Criar conta e a unica operacao sensivel que roda no backend (login, troca e
// recuperacao de senha falam direto com o Supabase Auth pelo front-end), entao
// e a que recebe o limite mais apertado, contra cadastro automatizado em massa.
const registroLimiter = criarRateLimiter({
  nome: 'registro',
  windowMs: inteiroPositivo(process.env.RATE_LIMIT_REGISTRO_WINDOW_MS, QUINZE_MINUTOS),
  limit: inteiroPositivo(process.env.RATE_LIMIT_REGISTRO_MAX, 5),
  message: 'Muitas contas criadas a partir deste endereco. Aguarde alguns minutos e tente novamente.',
});

const freteLimiter = criarRateLimiter({
  nome: 'frete',
  windowMs: inteiroPositivo(process.env.RATE_LIMIT_FRETE_WINDOW_MS, UM_MINUTO),
  limit: inteiroPositivo(process.env.RATE_LIMIT_FRETE_MAX, 30),
  message: 'Limite de calculos de frete atingido. Aguarde um momento.',
});

module.exports = {
  apiLimiter,
  authLimiter,
  registroLimiter,
  freteLimiter,
  criarRateLimiter,
  configurarConfiancaNoProxy,
  resolverTrustProxy,
};
