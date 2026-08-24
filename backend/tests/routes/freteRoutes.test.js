const request = require('supertest');

jest.mock('fs', () => ({
  existsSync: jest.fn(() => false),
  readFileSync: jest.fn(() => ''),
  writeFileSync: jest.fn(),
}));

const { buildTestApp } = require('../helpers/testApp');

// Reatribuido a cada `criarApp`, porque `jest.resetModules` recria o mock de fs.
let fs;

const ME_BASE_URL = 'https://sandbox.melhorenvio.com.br';
const URL_CALCULO = `${ME_BASE_URL}/api/v2/me/shipment/calculate`;
const URL_TOKEN = `${ME_BASE_URL}/oauth/token`;

function respostaJson(body, { ok = true, status = 200 } = {}) {
  return { ok, status, json: jest.fn().mockResolvedValue(body), text: jest.fn().mockResolvedValue('') };
}

function opcaoMelhorEnvio(overrides = {}) {
  return {
    id: 1,
    name: 'PAC',
    company: { name: 'Correios', picture: 'correios.png' },
    price: '35.90',
    delivery_time: 7,
    delivery_range: { min: 6, max: 8 },
    discount: '0',
    ...overrides,
  };
}

const CORPO_VALIDO = {
  cep_origem: '01310-100',
  cep_destino: '20040-020',
  produtos: [{ id: 10, peso_gramas: 800, comprimento_mm: 200, largura_mm: 150, altura_mm: 100, preco: 350, quantidade: 2 }],
};

// O router guarda os tokens em memoria, entao cada teste recarrega o modulo.
function criarApp(env = {}) {
  jest.resetModules();

  Object.entries({
    MELHOR_ENVIO_URL: ME_BASE_URL,
    MELHOR_ENVIO_CLIENT_ID: 'client-1',
    MELHOR_ENVIO_CLIENT_SECRET: 'secret-1',
    MELHOR_ENVIO_REDIRECT_URI: 'https://bigpecas.com/callback',
    MELHOR_ENVIO_ACCESS_TOKEN: 'access-antigo',
    MELHOR_ENVIO_REFRESH_TOKEN: 'refresh-antigo',
    ...env,
  }).forEach(([chave, valor]) => {
    process.env[chave] = valor;
  });

  fs = require('fs');
  require('../../src/utils/logger').transports.forEach((transport) => {
    transport.silent = true;
  });

  return buildTestApp(require('../../src/routes/freteRoutes'), { basePath: '/api/frete' });
}

function payloadEnviado(chamada = 0) {
  return JSON.parse(global.fetch.mock.calls[chamada][1].body);
}

describe('freteRoutes', () => {
  let envOriginal;
  let app;

  beforeEach(() => {
    envOriginal = { ...process.env };
    global.fetch = jest.fn();
    app = criarApp();
  });

  afterEach(() => {
    process.env = envOriginal;
    delete global.fetch;
  });

  describe('POST /calcular', () => {
    it('normaliza as opcoes do Melhor Envio e ordena pelo menor preco', async () => {
      global.fetch.mockResolvedValue(respostaJson([
        opcaoMelhorEnvio({ id: 2, name: 'SEDEX', price: '58.10', delivery_range: { min: 2, max: 3 } }),
        opcaoMelhorEnvio(),
      ]));

      const resposta = await request(app).post('/api/frete/calcular').send(CORPO_VALIDO);

      expect(resposta.status).toBe(200);
      expect(resposta.body.cep_destino).toBe('20040020');
      expect(resposta.body.opcoes).toEqual([
        expect.objectContaining({ id: 1, transportadora: 'Correios', tipo: 'PAC', valor: 35.9, prazo_min: 6, prazo_max: 8 }),
        expect.objectContaining({ id: 2, tipo: 'SEDEX', valor: 58.1 }),
      ]);
    });

    it('converte milimetros em centimetros e gramas em quilos para a API', async () => {
      global.fetch.mockResolvedValue(respostaJson([]));

      await request(app).post('/api/frete/calcular').send(CORPO_VALIDO);

      expect(payloadEnviado()).toEqual({
        from: { postal_code: '01310100' },
        to: { postal_code: '20040020' },
        products: [{
          id: '10',
          width: 15,
          height: 10,
          length: 20,
          weight: 0.8,
          insurance_value: 350,
          quantity: 2,
        }],
      });
    });

    it('extrai numeros de medidas escritas com unidade', async () => {
      global.fetch.mockResolvedValue(respostaJson([]));

      await request(app).post('/api/frete/calcular').send({
        ...CORPO_VALIDO,
        produtos: [{ id: 1, peso_gramas: '2000g', comprimento_mm: '300mm', largura_mm: '200 mm', altura_mm: '150mm', preco: 'R$ 99.90', quantidade: '3un' }],
      });

      expect(payloadEnviado().products[0]).toMatchObject({
        weight: 2,
        length: 30,
        width: 20,
        height: 15,
        insurance_value: 99.9,
        quantity: 3,
      });
    });

    it('usa medidas padrao quando o produto nao as informa', async () => {
      global.fetch.mockResolvedValue(respostaJson([]));

      await request(app).post('/api/frete/calcular').send({ ...CORPO_VALIDO, produtos: [{}] });

      expect(payloadEnviado().products[0]).toEqual({
        id: '1',
        width: 15,
        height: 10,
        length: 20,
        weight: 0.5,
        insurance_value: 100,
        quantity: 1,
      });
    });

    it('respeita os minimos de dimensao, peso e quantidade', async () => {
      global.fetch.mockResolvedValue(respostaJson([]));

      await request(app).post('/api/frete/calcular').send({
        ...CORPO_VALIDO,
        produtos: [{ id: 1, peso_gramas: 0, comprimento_mm: 0, largura_mm: 0, altura_mm: 0, preco: 0, quantidade: 0 }],
      });

      expect(payloadEnviado().products[0]).toMatchObject({
        width: 1,
        height: 1,
        length: 1,
        weight: 0.1,
        insurance_value: 1,
        quantity: 1,
      });
    });

    it('descarta opcoes com erro ou sem preco', async () => {
      global.fetch.mockResolvedValue(respostaJson([
        opcaoMelhorEnvio(),
        { id: 3, name: 'Jadlog', error: 'Serviço indisponível para a rota' },
        { id: 4, name: 'Azul Cargo', price: null },
      ]));

      const resposta = await request(app).post('/api/frete/calcular').send(CORPO_VALIDO);

      expect(resposta.body.opcoes.map((opcao) => opcao.id)).toEqual([1]);
    });

    it('prefere os valores negociados (custom) quando existirem', async () => {
      global.fetch.mockResolvedValue(respostaJson([
        opcaoMelhorEnvio({
          custom_price: '29.90',
          custom_delivery_range: { min: 3, max: 5 },
          custom_delivery_time: 4,
          discount: '6.00',
        }),
      ]));

      const { opcoes } = (await request(app).post('/api/frete/calcular').send(CORPO_VALIDO)).body;

      expect(opcoes[0]).toMatchObject({
        valor: 29.9,
        prazo_min: 3,
        prazo_max: 5,
        prazo_dias: 4,
        desconto: 6,
        prazo_texto: 'Entrega em até 5 dias úteis',
      });
    });

    it('usa texto no singular para entrega em um dia util', async () => {
      global.fetch.mockResolvedValue(respostaJson([
        opcaoMelhorEnvio({ custom_delivery_range: { min: 1, max: 1 } }),
      ]));

      const { opcoes } = (await request(app).post('/api/frete/calcular').send(CORPO_VALIDO)).body;

      expect(opcoes[0].prazo_texto).toBe('Entrega em 1 dia útil');
    });

    it('devolve lista vazia quando a resposta nao e um array', async () => {
      global.fetch.mockResolvedValue(respostaJson({ mensagem: 'sem cotacoes' }));

      const resposta = await request(app).post('/api/frete/calcular').send(CORPO_VALIDO);

      expect(resposta.body.opcoes).toEqual([]);
    });

    it.each([
      ['origem ausente', { cep_origem: undefined }, 'CEP de origem inválido.'],
      ['origem curto', { cep_origem: '0131' }, 'CEP de origem inválido.'],
      ['destino ausente', { cep_destino: '' }, 'CEP de destino inválido.'],
      ['destino com letras', { cep_destino: 'abcdefgh' }, 'CEP de destino inválido.'],
    ])('recusa %s com 400', async (_descricao, alteracao, mensagem) => {
      const resposta = await request(app)
        .post('/api/frete/calcular')
        .send({ ...CORPO_VALIDO, ...alteracao });

      expect(resposta.status).toBe(400);
      expect(resposta.body.error).toBe(mensagem);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it.each([
      ['lista vazia', []],
      ['nao e lista', 'friso'],
      ['ausente', undefined],
    ])('recusa produtos %s com 400', async (_descricao, produtos) => {
      const resposta = await request(app)
        .post('/api/frete/calcular')
        .send({ ...CORPO_VALIDO, produtos });

      expect(resposta.status).toBe(400);
      expect(resposta.body.error).toBe('Informe ao menos um produto para calcular o frete.');
    });

    it('propaga o erro do Melhor Envio com o status original', async () => {
      global.fetch.mockResolvedValue(
        respostaJson({ message: 'CEP de destino fora de área' }, { ok: false, status: 422 }),
      );

      const resposta = await request(app).post('/api/frete/calcular').send(CORPO_VALIDO);

      expect(resposta.status).toBe(422);
      expect(resposta.body.error).toBe('CEP de destino fora de área');
    });

    it('usa mensagem padrao quando o Melhor Envio nao explica o erro', async () => {
      global.fetch.mockResolvedValue(respostaJson({}, { ok: false, status: 500 }));

      const resposta = await request(app).post('/api/frete/calcular').send(CORPO_VALIDO);

      expect(resposta.body.error).toBe('Erro ao calcular frete no Melhor Envio.');
    });

    describe('renovacao automatica de token', () => {
      it('renova o token e refaz o calculo quando recebe 401', async () => {
        global.fetch
          .mockResolvedValueOnce(respostaJson({}, { ok: false, status: 401 }))
          .mockResolvedValueOnce(respostaJson({ access_token: 'access-novo', refresh_token: 'refresh-novo', expires_in: 2592000 }))
          .mockResolvedValueOnce(respostaJson([opcaoMelhorEnvio()]));

        const resposta = await request(app).post('/api/frete/calcular').send(CORPO_VALIDO);

        expect(resposta.status).toBe(200);
        expect(global.fetch).toHaveBeenCalledTimes(3);
        expect(global.fetch.mock.calls[1][0]).toBe(URL_TOKEN);
        expect(payloadEnviado(1)).toMatchObject({
          grant_type: 'refresh_token',
          client_id: 'client-1',
          client_secret: 'secret-1',
          refresh_token: 'refresh-antigo',
        });
      });

      it('reenvia o calculo com o novo access token', async () => {
        global.fetch
          .mockResolvedValueOnce(respostaJson({}, { ok: false, status: 401 }))
          .mockResolvedValueOnce(respostaJson({ access_token: 'access-novo', refresh_token: 'refresh-novo' }))
          .mockResolvedValueOnce(respostaJson([]));

        await request(app).post('/api/frete/calcular').send(CORPO_VALIDO);

        expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer access-antigo');
        expect(global.fetch.mock.calls[2][0]).toBe(URL_CALCULO);
        expect(global.fetch.mock.calls[2][1].headers.Authorization).toBe('Bearer access-novo');
      });

      it('devolve 502 quando a renovacao do token falha', async () => {
        global.fetch
          .mockResolvedValueOnce(respostaJson({}, { ok: false, status: 401 }))
          .mockResolvedValueOnce({
            ok: false,
            status: 401,
            text: jest.fn().mockResolvedValue('{"error":"invalid_grant"}'),
            json: jest.fn(),
          });

        const resposta = await request(app).post('/api/frete/calcular').send(CORPO_VALIDO);

        expect(resposta.status).toBe(502);
        expect(resposta.body.error).toContain('Falha ao renovar token do Melhor Envio');
      });

      it('nao renova o token quando a primeira chamada funciona', async () => {
        global.fetch.mockResolvedValue(respostaJson([]));

        await request(app).post('/api/frete/calcular').send(CORPO_VALIDO);

        expect(global.fetch).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('POST /refresh', () => {
    it('renova o token manualmente e devolve o prazo de expiracao', async () => {
      global.fetch.mockResolvedValue(
        respostaJson({ access_token: 'access-novo', refresh_token: 'refresh-novo', expires_in: 2592000 }),
      );

      const resposta = await request(app).post('/api/frete/refresh');

      expect(resposta.status).toBe(200);
      expect(resposta.body).toEqual({ message: 'Token renovado com sucesso.', expires_in: 2592000 });
    });

    it('grava os novos tokens no .env quando o arquivo existe', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(
        'MELHOR_ENVIO_ACCESS_TOKEN=access-antigo\nMELHOR_ENVIO_REFRESH_TOKEN=refresh-antigo\n',
      );
      global.fetch.mockResolvedValue(
        respostaJson({ access_token: 'access-novo', refresh_token: 'refresh-novo' }),
      );

      await request(app).post('/api/frete/refresh');

      const [, conteudo] = fs.writeFileSync.mock.calls[0];
      expect(conteudo).toContain('MELHOR_ENVIO_ACCESS_TOKEN=access-novo');
      expect(conteudo).toContain('MELHOR_ENVIO_REFRESH_TOKEN=refresh-novo');
    });

    it('nao tenta escrever quando o .env nao existe', async () => {
      fs.existsSync.mockReturnValue(false);
      global.fetch.mockResolvedValue(
        respostaJson({ access_token: 'access-novo', refresh_token: 'refresh-novo' }),
      );

      const resposta = await request(app).post('/api/frete/refresh');

      expect(resposta.status).toBe(200);
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    it('conclui a renovacao mesmo se a escrita do .env falhar', async () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('MELHOR_ENVIO_ACCESS_TOKEN=access-antigo\n');
      fs.writeFileSync.mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });
      global.fetch.mockResolvedValue(
        respostaJson({ access_token: 'access-novo', refresh_token: 'refresh-novo' }),
      );

      expect((await request(app).post('/api/frete/refresh')).status).toBe(200);
    });

    it('devolve 502 quando o Melhor Envio recusa o refresh token', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: jest.fn().mockResolvedValue('{"error":"invalid_grant"}'),
        json: jest.fn(),
      });

      const resposta = await request(app).post('/api/frete/refresh');

      expect(resposta.status).toBe(502);
    });
  });
});
