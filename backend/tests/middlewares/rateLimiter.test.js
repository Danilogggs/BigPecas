const express = require('express');
const request = require('supertest');

const {
  criarRateLimiter,
  resolverTrustProxy,
  configurarConfiancaNoProxy,
} = require('../../src/middlewares/rateLimiter');
const errorHandler = require('../../src/middlewares/errorHandler');
const logger = require('../../src/utils/logger');

const MENSAGEM = 'Muitas requisicoes. Aguarde um momento e tente novamente.';

/**
 * App minimo com um limitador e o errorHandler real, para exercitar o caminho
 * completo do 429: limitador -> next(AppError) -> errorHandler -> resposta.
 *
 * `trust proxy` fica em 1 salto para que os testes possam simular clientes
 * diferentes via X-Forwarded-For, como aconteceria atras de um nginx.
 */
function buildApp(limiter, { rotas = ['/api/recurso'], trustProxy = 1 } = {}) {
  const app = express();

  app.set('trust proxy', trustProxy);
  app.use(limiter);

  rotas.forEach((rota) => {
    app.get(rota, (req, res) => res.json({ ok: true, rota }));
  });

  app.use(errorHandler);

  return app;
}

function limitadorPadrao(overrides = {}) {
  return criarRateLimiter({
    nome: 'teste',
    windowMs: 60 * 1000,
    limit: 3,
    message: MENSAGEM,
    ...overrides,
  });
}

/** Dispara `total` requisicoes em sequencia a partir de um mesmo IP. */
async function dispararRequisicoes(app, total, { ip = '203.0.113.10', rota = '/api/recurso' } = {}) {
  const respostas = [];

  for (let tentativa = 0; tentativa < total; tentativa += 1) {
    respostas.push(await request(app).get(rota).set('X-Forwarded-For', ip));
  }

  return respostas;
}

describe('rateLimiter', () => {
  describe('requisicoes dentro do limite', () => {
    it('deixa passar ate o limite configurado', async () => {
      const app = buildApp(limitadorPadrao());

      const respostas = await dispararRequisicoes(app, 3);

      expect(respostas.map((resposta) => resposta.status)).toEqual([200, 200, 200]);
      expect(respostas[2].body).toEqual({ ok: true, rota: '/api/recurso' });
    });

    it('expoe o padrao RateLimit-* e vai consumindo a cota', async () => {
      const app = buildApp(limitadorPadrao());

      const [primeira, , terceira] = await dispararRequisicoes(app, 3);

      expect(primeira.headers['ratelimit-limit']).toBe('3');
      expect(primeira.headers['ratelimit-remaining']).toBe('2');
      expect(terceira.headers['ratelimit-remaining']).toBe('0');
    });

    it('nao envia os cabecalhos legados X-RateLimit-*', async () => {
      const app = buildApp(limitadorPadrao());

      const [resposta] = await dispararRequisicoes(app, 1);

      expect(resposta.headers['x-ratelimit-limit']).toBeUndefined();
    });
  });

  describe('requisicoes acima do limite', () => {
    it('bloqueia a requisicao seguinte com 429', async () => {
      const app = buildApp(limitadorPadrao());

      const respostas = await dispararRequisicoes(app, 4);

      expect(respostas.map((resposta) => resposta.status)).toEqual([200, 200, 200, 429]);
    });

    it('responde no mesmo formato { error } dos demais erros da API', async () => {
      const app = buildApp(limitadorPadrao());

      const [bloqueada] = (await dispararRequisicoes(app, 4)).slice(-1);

      expect(bloqueada.body).toEqual({ error: MENSAGEM });
    });

    it('informa ao cliente quando ele pode tentar de novo', async () => {
      const app = buildApp(limitadorPadrao());

      const [bloqueada] = (await dispararRequisicoes(app, 4)).slice(-1);

      expect(Number(bloqueada.headers['retry-after'])).toBeGreaterThan(0);
      expect(bloqueada.headers['ratelimit-remaining']).toBe('0');
    });

    it('continua bloqueando enquanto a janela nao virar', async () => {
      const app = buildApp(limitadorPadrao());

      const respostas = await dispararRequisicoes(app, 6);

      expect(respostas.slice(3).map((resposta) => resposta.status)).toEqual([429, 429, 429]);
    });

    it('registra o bloqueio no log com o limitador, a rota e o IP', async () => {
      const aviso = jest.spyOn(logger, 'warn').mockImplementation(() => {});
      const app = buildApp(limitadorPadrao());

      await dispararRequisicoes(app, 4, { ip: '203.0.113.77' });

      expect(aviso).toHaveBeenCalledWith('Limite de requisicoes atingido', {
        limitador: 'teste',
        method: 'GET',
        path: '/api/recurso',
        ip: '203.0.113.77',
      });
    });

    it('o bloqueio tambem aparece no log padrao de erro de cliente', async () => {
      const aviso = jest.spyOn(logger, 'warn').mockImplementation(() => {});
      const app = buildApp(limitadorPadrao());

      await dispararRequisicoes(app, 4);

      expect(aviso).toHaveBeenCalledWith(
        'Erro de cliente',
        expect.objectContaining({ statusCode: 429, path: '/api/recurso' }),
      );
    });

    it('nao registra nada enquanto o cliente esta dentro do limite', async () => {
      const aviso = jest.spyOn(logger, 'warn').mockImplementation(() => {});
      const app = buildApp(limitadorPadrao());

      await dispararRequisicoes(app, 3);

      expect(aviso).not.toHaveBeenCalled();
    });
  });

  describe('reinicio depois da janela', () => {
    it('libera o cliente quando a janela expira', async () => {
      const app = buildApp(limitadorPadrao({ windowMs: 120, limit: 2 }));

      const antes = await dispararRequisicoes(app, 3);
      expect(antes.map((resposta) => resposta.status)).toEqual([200, 200, 429]);

      await new Promise((resolve) => setTimeout(resolve, 150));

      const depois = await dispararRequisicoes(app, 1);
      expect(depois[0].status).toBe(200);
      expect(depois[0].headers['ratelimit-remaining']).toBe('1');
    });

    it('mantem o bloqueio se a janela ainda nao virou', async () => {
      const app = buildApp(limitadorPadrao({ windowMs: 10 * 1000, limit: 1 }));

      await dispararRequisicoes(app, 2);
      await new Promise((resolve) => setTimeout(resolve, 60));

      const [depois] = await dispararRequisicoes(app, 1);
      expect(depois.status).toBe(429);
    });
  });

  describe('isolamento entre clientes', () => {
    it('cada IP tem sua propria cota', async () => {
      const app = buildApp(limitadorPadrao({ limit: 2 }));

      await dispararRequisicoes(app, 3, { ip: '203.0.113.1' });
      const outroCliente = await dispararRequisicoes(app, 2, { ip: '198.51.100.1' });

      expect(outroCliente.map((resposta) => resposta.status)).toEqual([200, 200]);
    });

    it('bloquear um IP nao afeta os demais', async () => {
      const app = buildApp(limitadorPadrao({ limit: 1 }));

      const [, bloqueado] = await dispararRequisicoes(app, 2, { ip: '203.0.113.1' });
      const [livre] = await dispararRequisicoes(app, 1, { ip: '198.51.100.1' });

      expect(bloqueado.status).toBe(429);
      expect(livre.status).toBe(200);
    });

    it('a cota vale para todas as rotas cobertas pelo limitador', async () => {
      const app = buildApp(limitadorPadrao({ limit: 2 }), {
        rotas: ['/api/recurso', '/api/outro'],
      });

      await dispararRequisicoes(app, 1, { rota: '/api/recurso' });
      await dispararRequisicoes(app, 1, { rota: '/api/outro' });
      const [terceira] = await dispararRequisicoes(app, 1, { rota: '/api/recurso' });

      expect(terceira.status).toBe(429);
    });

    it('limitadores diferentes contam separadamente', async () => {
      const app = express();
      app.set('trust proxy', 1);
      app.use('/api/geral', limitadorPadrao({ nome: 'geral', limit: 2 }));
      app.use('/api/sensivel', limitadorPadrao({ nome: 'sensivel', limit: 1 }));
      app.get('/api/geral', (req, res) => res.json({ ok: true }));
      app.get('/api/sensivel', (req, res) => res.json({ ok: true }));
      app.use(errorHandler);

      const sensivel = await dispararRequisicoes(app, 2, { rota: '/api/sensivel' });
      const geral = await dispararRequisicoes(app, 2, { rota: '/api/geral' });

      expect(sensivel.map((r) => r.status)).toEqual([200, 429]);
      expect(geral.map((r) => r.status)).toEqual([200, 200]);
    });
  });

  describe('opcao skip', () => {
    it('nao contabiliza as rotas ignoradas', async () => {
      const app = buildApp(
        limitadorPadrao({ limit: 1, skip: (req) => req.path === '/api/health' }),
        { rotas: ['/api/recurso', '/api/health'] },
      );

      await dispararRequisicoes(app, 5, { rota: '/api/health' });
      const [depois] = await dispararRequisicoes(app, 1, { rota: '/api/recurso' });

      expect(depois.status).toBe(200);
    });

    it('mantem a rota ignorada respondendo mesmo com o cliente ja bloqueado', async () => {
      const app = buildApp(
        limitadorPadrao({ limit: 1, skip: (req) => req.path === '/api/health' }),
        { rotas: ['/api/recurso', '/api/health'] },
      );

      const [, bloqueada] = await dispararRequisicoes(app, 2, { rota: '/api/recurso' });
      const [health] = await dispararRequisicoes(app, 1, { rota: '/api/health' });

      expect(bloqueada.status).toBe(429);
      expect(health.status).toBe(200);
    });
  });

  describe('desligar por configuracao', () => {
    it('nao bloqueia nada quando RATE_LIMIT_ENABLED=false', async () => {
      jest.resetModules();
      process.env.RATE_LIMIT_ENABLED = 'false';

      try {
        const modulo = require('../../src/middlewares/rateLimiter');
        const app = buildApp(modulo.criarRateLimiter({
          nome: 'desligado',
          windowMs: 60 * 1000,
          limit: 1,
          message: MENSAGEM,
        }));

        const respostas = await dispararRequisicoes(app, 4);

        expect(respostas.every((resposta) => resposta.status === 200)).toBe(true);
      } finally {
        delete process.env.RATE_LIMIT_ENABLED;
        jest.resetModules();
      }
    });
  });

  describe('limites configurados por variavel de ambiente', () => {
    function carregarComEnv(env) {
      jest.resetModules();
      const original = { ...process.env };
      Object.assign(process.env, env);

      try {
        // `resetModules` recria o logger, que volta a escrever no console.
        require('../../src/utils/logger').transports.forEach((transport) => {
          transport.silent = true;
        });

        return require('../../src/middlewares/rateLimiter');
      } finally {
        process.env = original;
        jest.resetModules();
      }
    }

    it('respeita o limite informado em RATE_LIMIT_MAX', async () => {
      const { apiLimiter } = carregarComEnv({ RATE_LIMIT_MAX: '2' });
      const app = buildApp(apiLimiter);

      const respostas = await dispararRequisicoes(app, 3);

      expect(respostas.map((resposta) => resposta.status)).toEqual([200, 200, 429]);
    });

    it.each([
      ['valor nao numerico', 'muitas'],
      ['zero', '0'],
      ['negativo', '-5'],
      ['vazio', ''],
    ])('ignora %s e usa o padrao de 250', async (_descricao, valor) => {
      const { apiLimiter } = carregarComEnv({ RATE_LIMIT_MAX: valor });
      const app = buildApp(apiLimiter);

      const [resposta] = await dispararRequisicoes(app, 1);

      expect(resposta.headers['ratelimit-limit']).toBe('250');
    });

    it('aplica o limite restrito de registro de conta', async () => {
      const { registroLimiter } = carregarComEnv({});
      const app = buildApp(registroLimiter);

      const [resposta] = await dispararRequisicoes(app, 1);

      expect(resposta.headers['ratelimit-limit']).toBe('5');
    });

    it('usa limites menores para autenticacao e frete do que para a API em geral', () => {
      const { apiLimiter, authLimiter, freteLimiter, registroLimiter } = carregarComEnv({});

      expect([apiLimiter, authLimiter, freteLimiter, registroLimiter]
        .every((limitador) => typeof limitador === 'function')).toBe(true);
    });
  });

  describe('resolverTrustProxy', () => {
    it.each([
      [undefined, false],
      ['', false],
      ['   ', false],
      ['false', false],
      ['FALSE', false],
    ])('trata %p como nao confiar em proxy nenhum', (valor, esperado) => {
      expect(resolverTrustProxy(valor)).toBe(esperado);
    });

    it.each([
      ['1', 1],
      ['2', 2],
      ['0', 0],
    ])('converte "%s" na quantidade de proxies confiaveis', (valor, esperado) => {
      expect(resolverTrustProxy(valor)).toBe(esperado);
    });

    it('aceita um unico IP confiavel', () => {
      expect(resolverTrustProxy('10.0.0.1')).toBe('10.0.0.1');
    });

    it('aceita uma lista de IPs e faixas confiaveis', () => {
      expect(resolverTrustProxy('10.0.0.1, 192.168.0.0/16 ,loopback')).toEqual([
        '10.0.0.1',
        '192.168.0.0/16',
        'loopback',
      ]);
    });

    it('permite o valor permissivo true, para quem realmente precisar', () => {
      expect(resolverTrustProxy('true')).toBe(true);
    });
  });

  describe('configurarConfiancaNoProxy', () => {
    let envOriginal;

    beforeEach(() => {
      envOriginal = { ...process.env };
    });

    afterEach(() => {
      process.env = envOriginal;
    });

    it('por padrao nao confia em nenhum proxy', () => {
      delete process.env.TRUST_PROXY;
      const app = express();

      expect(configurarConfiancaNoProxy(app)).toBe(false);
      expect(app.get('trust proxy')).toBe(false);
    });

    it('aplica a quantidade de proxies informada', () => {
      process.env.TRUST_PROXY = '1';
      const app = express();

      configurarConfiancaNoProxy(app);

      expect(app.get('trust proxy')).toBe(1);
    });

    it('avisa no log quando a configuracao aceita qualquer X-Forwarded-For', () => {
      const aviso = jest.spyOn(logger, 'warn').mockImplementation(() => {});
      process.env.TRUST_PROXY = 'true';

      configurarConfiancaNoProxy(express());

      expect(aviso).toHaveBeenCalledWith(expect.stringContaining('burlar o rate limit'));
    });

    it('nao avisa quando a configuracao e segura', () => {
      const aviso = jest.spyOn(logger, 'warn').mockImplementation(() => {});
      process.env.TRUST_PROXY = '1';

      configurarConfiancaNoProxy(express());

      expect(aviso).not.toHaveBeenCalled();
    });
  });

  describe('identificacao do cliente', () => {
    it('sem confiar em proxy, o X-Forwarded-For e ignorado e todos dividem a cota', async () => {
      const app = buildApp(limitadorPadrao({ limit: 2 }), { trustProxy: false });

      const respostas = [
        await request(app).get('/api/recurso'),
        await request(app).get('/api/recurso'),
        await request(app).get('/api/recurso'),
      ];

      expect(respostas.map((resposta) => resposta.status)).toEqual([200, 200, 429]);
    });

    it('confiando em 1 proxy, usa o IP repassado pelo proxy', async () => {
      const app = buildApp(limitadorPadrao({ limit: 1 }));

      const [primeira] = await dispararRequisicoes(app, 1, { ip: '203.0.113.1' });
      const [outro] = await dispararRequisicoes(app, 1, { ip: '198.51.100.1' });

      expect(primeira.status).toBe(200);
      expect(outro.status).toBe(200);
    });

    it('agrupa enderecos IPv6 da mesma sub-rede /56, contra rotacao de IP', async () => {
      const app = buildApp(limitadorPadrao({ limit: 1 }));

      const [primeira] = await dispararRequisicoes(app, 1, { ip: '2001:db8:abcd:0100::1' });
      const [segunda] = await dispararRequisicoes(app, 1, { ip: '2001:db8:abcd:0100::99' });

      expect(primeira.status).toBe(200);
      expect(segunda.status).toBe(429);
    });
  });
});
