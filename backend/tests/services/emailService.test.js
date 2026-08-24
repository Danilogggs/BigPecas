const mockMailgunCreate = jest.fn();
const mockMailgunClient = jest.fn(() => ({ messages: { create: mockMailgunCreate } }));

jest.mock('mailgun.js', () => jest.fn().mockImplementation(() => ({ client: mockMailgunClient })));

const ENV_BASE = {
  EMAIL_NOTIFICACAO_VENDA_FROM: 'BigPeças <noreply@bigpecas.com>',
  EMAIL_NOTIFICACAO_VENDA_ENABLED: undefined,
  RESEND_API_KEY: undefined,
  MAILGUN_API_KEY: undefined,
  MAILGUN_DOMAIN: undefined,
  MAILGUN_API_URL: undefined,
};

// O emailService le as variaveis de ambiente no carregamento, entao cada cenario
// precisa recarregar o modulo com a configuracao desejada.
function carregarServico(env = {}) {
  jest.resetModules();

  Object.entries({ ...ENV_BASE, ...env }).forEach(([chave, valor]) => {
    if (valor === undefined) delete process.env[chave];
    else process.env[chave] = valor;
  });

  return require('../../src/services/emailService');
}

function respostaFetch({ ok = true, body = { id: 'email-1' }, texto = '' } = {}) {
  return {
    ok,
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(texto),
  };
}

const VENDA = {
  to: 'vendedor@bigpecas.com',
  vendedorNome: 'Loja do Zé',
  clienteNome: 'Maria',
  pedidoId: '2026-100200',
  itens: [{ nome: 'Friso Opala', quantidade: 2, preco: 350 }],
  valorTotal: 700,
};

describe('emailService', () => {
  let envOriginal;

  beforeEach(() => {
    envOriginal = { ...process.env };
    global.fetch = jest.fn();
  });

  afterEach(() => {
    process.env = envOriginal;
    delete global.fetch;
  });

  describe('quando nenhum provedor esta configurado', () => {
    it('nao envia e informa o motivo', async () => {
      const { enviarNotificacaoVendaVendedor } = carregarServico();

      await expect(enviarNotificacaoVendaVendedor(VENDA)).resolves.toEqual({
        sent: false,
        reason: 'nenhum_provedor_configurado',
      });
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('quando o envio esta desligado por configuracao', () => {
    it('nao envia mesmo com o Resend configurado', async () => {
      const { enviarNotificacaoVendaVendedor } = carregarServico({
        EMAIL_NOTIFICACAO_VENDA_ENABLED: 'false',
        RESEND_API_KEY: 're_123',
      });

      await expect(enviarNotificacaoVendaVendedor(VENDA)).resolves.toEqual({
        sent: false,
        reason: 'email_notificacao_desabilitado',
      });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('permanece ligado por padrao quando a variavel nao existe', async () => {
      const { enviarNotificacaoVendaVendedor } = carregarServico({ RESEND_API_KEY: 're_123' });
      global.fetch.mockResolvedValue(respostaFetch());

      await expect(enviarNotificacaoVendaVendedor(VENDA)).resolves.toMatchObject({ sent: true });
    });
  });

  describe('validacao do destinatario', () => {
    it.each([[undefined], [''], [null]])('nao envia quando "to" e %p', async (to) => {
      const { enviarNotificacaoVendaVendedor } = carregarServico({ RESEND_API_KEY: 're_123' });

      await expect(enviarNotificacaoVendaVendedor({ ...VENDA, to })).resolves.toEqual({
        sent: false,
        reason: 'email_destinatario_nao_definido',
      });
    });
  });

  describe('envio via Resend', () => {
    it('chama a API com remetente, destinatario e conteudo', async () => {
      const { enviarNotificacaoVendaVendedor } = carregarServico({ RESEND_API_KEY: 're_123' });
      global.fetch.mockResolvedValue(respostaFetch({ body: { id: 'msg-1' } }));

      const resultado = await enviarNotificacaoVendaVendedor(VENDA);

      expect(resultado).toEqual({ sent: true, provider: 'resend', response: { id: 'msg-1' } });

      const [url, opcoes] = global.fetch.mock.calls[0];
      expect(url).toBe('https://api.resend.com/emails');
      expect(opcoes.method).toBe('POST');
      expect(opcoes.headers.Authorization).toBe('Bearer re_123');

      const corpo = JSON.parse(opcoes.body);
      expect(corpo.from).toBe('BigPeças <noreply@bigpecas.com>');
      expect(corpo.to).toEqual(['vendedor@bigpecas.com']);
      expect(corpo.subject).toBe('Venda confirmada — Pedido #2026-100200');
    });

    it('lanca erro com o corpo da resposta quando o Resend recusa o envio', async () => {
      const { enviarNotificacaoVendaVendedor } = carregarServico({ RESEND_API_KEY: 're_123' });
      global.fetch.mockResolvedValue(
        respostaFetch({ ok: false, texto: '{"message":"domain not verified"}' }),
      );

      await expect(enviarNotificacaoVendaVendedor(VENDA)).rejects.toThrow(
        /Falha ao enviar e-mail via Resend: .*domain not verified/,
      );
    });
  });

  describe('envio via Mailgun', () => {
    const ENV_MAILGUN = { MAILGUN_API_KEY: 'key-123', MAILGUN_DOMAIN: 'mg.bigpecas.com' };

    it('e usado como alternativa quando o Resend nao esta configurado', async () => {
      const { enviarNotificacaoVendaVendedor } = carregarServico(ENV_MAILGUN);
      mockMailgunCreate.mockResolvedValue({ id: 'mg-1' });

      const resultado = await enviarNotificacaoVendaVendedor(VENDA);

      expect(resultado).toEqual({ sent: true, provider: 'mailgun', response: { id: 'mg-1' } });
      expect(mockMailgunClient).toHaveBeenCalledWith({ username: 'api', key: 'key-123' });
      expect(mockMailgunCreate).toHaveBeenCalledWith(
        'mg.bigpecas.com',
        expect.objectContaining({ to: ['vendedor@bigpecas.com'] }),
      );
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('respeita a url regional quando informada', async () => {
      const { enviarNotificacaoVendaVendedor } = carregarServico({
        ...ENV_MAILGUN,
        MAILGUN_API_URL: 'https://api.eu.mailgun.net',
      });
      mockMailgunCreate.mockResolvedValue({ id: 'mg-eu' });

      await enviarNotificacaoVendaVendedor(VENDA);

      expect(mockMailgunClient).toHaveBeenCalledWith(
        expect.objectContaining({ url: 'https://api.eu.mailgun.net' }),
      );
    });

    it('nao e usado quando so o dominio esta configurado', async () => {
      const { enviarNotificacaoVendaVendedor } = carregarServico({ MAILGUN_DOMAIN: 'mg.bigpecas.com' });

      await expect(enviarNotificacaoVendaVendedor(VENDA)).resolves.toEqual({
        sent: false,
        reason: 'nenhum_provedor_configurado',
      });
    });

    it('converte falhas do cliente em erro descritivo', async () => {
      const { enviarNotificacaoVendaVendedor } = carregarServico(ENV_MAILGUN);
      mockMailgunCreate.mockRejectedValue(new Error('Forbidden'));

      await expect(enviarNotificacaoVendaVendedor(VENDA)).rejects.toThrow(
        'Falha ao enviar e-mail via Mailgun: Forbidden',
      );
    });

    it('prefere o Resend quando os dois provedores estao configurados', async () => {
      const { enviarNotificacaoVendaVendedor } = carregarServico({
        ...ENV_MAILGUN,
        RESEND_API_KEY: 're_123',
      });
      global.fetch.mockResolvedValue(respostaFetch());

      await expect(enviarNotificacaoVendaVendedor(VENDA)).resolves.toMatchObject({
        provider: 'resend',
      });
      expect(mockMailgunCreate).not.toHaveBeenCalled();
    });
  });

  describe('conteudo da notificacao de venda', () => {
    async function corpoEnviado(dados) {
      const { enviarNotificacaoVendaVendedor } = carregarServico({ RESEND_API_KEY: 're_123' });
      global.fetch.mockResolvedValue(respostaFetch());

      await enviarNotificacaoVendaVendedor({ ...VENDA, ...dados });

      return JSON.parse(global.fetch.mock.calls[0][1].body);
    }

    it('formata os valores em reais e multiplica pela quantidade', async () => {
      const { text, html } = await corpoEnviado({});

      expect(text).toContain('Friso Opala');
      expect(text).toContain('2 unidade(s)');
      expect(text.replace(/ /g, ' ')).toContain('R$ 700,00');
      expect(html).toContain('Venda confirmada na BigPeças');
    });

    it('inclui o codigo de rastreio somente quando ele existe', async () => {
      const comRastreio = await corpoEnviado({ codigoRastreio: 'BG123456789AB' });
      const semRastreio = await corpoEnviado({});

      expect(comRastreio.text).toContain('Código de rastreio: BG123456789AB');
      expect(comRastreio.html).toContain('BG123456789AB');
      expect(semRastreio.text).not.toContain('Código de rastreio');
    });

    it('usa nomes padrao quando vendedor e cliente nao sao informados', async () => {
      const { text } = await corpoEnviado({ vendedorNome: undefined, clienteNome: undefined });

      expect(text).toContain('Olá, vendedor!');
      expect(text).toContain('Cliente: Cliente BigPeças');
    });

    it('mostra um item generico no html quando o pedido chega sem itens', async () => {
      const { html, text } = await corpoEnviado({ itens: [] });

      expect(html).toContain('<li>Peça(s) do pedido</li>');
      expect(text).toContain('Itens vendidos:');
    });

    it('assume quantidade 1 e preco 0 para itens incompletos', async () => {
      const { text } = await corpoEnviado({ itens: [{ nome_peca: 'Peça sem preço' }] });

      expect(text).toContain('Peça sem preço — 1 unidade(s)');
    });
  });

  describe('notificacao de mudanca de status para o cliente', () => {
    async function enviarStatus(dados) {
      const { enviarNotificacaoStatusPedidoCliente } = carregarServico({ RESEND_API_KEY: 're_123' });
      global.fetch.mockResolvedValue(respostaFetch());

      await enviarNotificacaoStatusPedidoCliente({
        to: 'cliente@bigpecas.com',
        clienteNome: 'Maria',
        pedidoId: '2026-100200',
        itens: VENDA.itens,
        valorTotal: 700,
        ...dados,
      });

      return JSON.parse(global.fetch.mock.calls[0][1].body);
    }

    it('traduz os status conhecidos no assunto e no corpo', async () => {
      const corpo = await enviarStatus({ statusAnterior: 'pago', statusAtual: 'enviado' });

      expect(corpo.subject).toBe('Pedido #2026-100200 atualizado: Pedido enviado');
      expect(corpo.text).toContain('Status anterior: Pagamento confirmado');
      expect(corpo.text).toContain('Novo status: Pedido enviado');
    });

    it('mantem o valor bruto de status desconhecidos', async () => {
      const corpo = await enviarStatus({ statusAnterior: 'novo', statusAtual: 'em_disputa' });

      expect(corpo.text).toContain('Status anterior: novo');
      expect(corpo.subject).toContain('em_disputa');
    });

    it('usa rotulos padrao quando os status nao sao informados', async () => {
      const corpo = await enviarStatus({});

      expect(corpo.text).toContain('Status anterior: Status anterior');
      expect(corpo.text).toContain('Novo status: Status atualizado');
    });
  });
});
