const request = require('supertest');
const { createSupabaseMock } = require('../helpers/supabaseMock');

const mockSupabaseAdmin = createSupabaseMock();
const mockGarantirVendasDoPedido = jest.fn(async (pedido) => pedido);
const mockSincronizarStatusVendas = jest.fn(async () => undefined);
const mockEnviarNotificacaoStatusPedidoCliente = jest.fn(async () => ({ sent: true }));
const mockEnviarNotificacaoVendaVendedor = jest.fn(async () => ({ sent: true }));

jest.mock('../../src/config/supabaseClient', () => ({
  supabaseAdmin: mockSupabaseAdmin,
  supabasePublic: null,
}));

jest.mock('../../src/services/vendasService', () => ({
  garantirVendasDoPedido: mockGarantirVendasDoPedido,
  sincronizarStatusVendas: mockSincronizarStatusVendas,
}));

jest.mock('../../src/services/emailService', () => ({
  enviarNotificacaoStatusPedidoCliente: mockEnviarNotificacaoStatusPedidoCliente,
  enviarNotificacaoVendaVendedor: mockEnviarNotificacaoVendaVendedor,
}));

const pedidosRoutes = require('../../src/routes/pedidosRoutes');
const { buildTestApp } = require('../helpers/testApp');

const COMPRADOR = { id: 42, email: 'cliente@bigpecas.com', full_name: 'Maria', nome_loja: null };
const VENDEDOR = { id: 5, email: 'vendedor@bigpecas.com', full_name: 'José', nome_loja: 'Loja do Zé' };

const PECA = {
  id: 10,
  nome_peca: 'Friso Opala',
  preco: 350,
  imagem: 'friso.png',
  sku: 'FR-1',
  estoque_atual: 5,
  fornecedor_id: 5,
};

function pedidoSalvo(overrides = {}) {
  return {
    id: '2026-100200',
    user_id: 42,
    status: 'aguardando_pagamento',
    itens: [{ id: 10, quantidade: 2, preco: 350, fornecedor_id: 5 }],
    endereco: { cep: '01310100' },
    frete: { valor: 30 },
    total: 730,
    codigo_rastreio: 'BG123456789AB',
    historico: [{ status: 'aguardando_pagamento', data: '2026-01-01T10:00:00.000Z' }],
    criado_em: '2026-01-01T10:00:00.000Z',
    ...overrides,
  };
}

function appComo(usuario) {
  return buildTestApp(pedidosRoutes, { user: { email: usuario.email }, basePath: '/api/pedidos' });
}

const appComprador = appComo(COMPRADOR);
const appVendedor = appComo(VENDEDOR);

/** `obterUsuarioAtual` sempre faz a primeira consulta em `users`. */
function mockarUsuarioAtual(usuario) {
  mockSupabaseAdmin.__queueTable('users', { data: usuario, error: null });
}

describe('pedidosRoutes', () => {
  beforeEach(() => {
    mockSupabaseAdmin.__reset();
    mockGarantirVendasDoPedido.mockImplementation(async (pedido) => pedido);
    mockSincronizarStatusVendas.mockResolvedValue(undefined);
    mockEnviarNotificacaoStatusPedidoCliente.mockResolvedValue({ sent: true });
    mockEnviarNotificacaoVendaVendedor.mockResolvedValue({ sent: true });
  });

  describe('GET /historico', () => {
    it('separa compras e vendas do mesmo usuario', async () => {
      const usuarioAmbos = { ...VENDEDOR, id: 5 };
      mockarUsuarioAtual(usuarioAmbos);
      mockSupabaseAdmin.__mockTable('pedidos', {
        data: [
          pedidoSalvo({ id: 'compra-1', user_id: 5, itens: [{ id: 10, quantidade: 1, fornecedor_id: 9 }] }),
          pedidoSalvo({ id: 'venda-1', user_id: 42, itens: [{ id: 10, quantidade: 2, fornecedor_id: 5 }] }),
        ],
        error: null,
      });
      mockSupabaseAdmin.__mockTable('pecas', { data: [PECA], error: null });
      mockSupabaseAdmin.__mockTable('users', { data: [COMPRADOR, usuarioAmbos], error: null });

      const resposta = await request(appVendedor).get('/api/pedidos/historico');

      expect(resposta.status).toBe(200);
      expect(resposta.body.compras.map((p) => p.id)).toEqual(['compra-1']);
      expect(resposta.body.vendas.map((p) => p.id)).toEqual(['venda-1']);
      expect(resposta.body.perfil).toEqual({ id: 5, tipo_usuario: 'ambos', pode_vender: true });
    });

    it('marca compras como somente leitura e vendas como atualizaveis', async () => {
      mockarUsuarioAtual(VENDEDOR);
      mockSupabaseAdmin.__mockTable('pedidos', {
        data: [pedidoSalvo({ user_id: 42 })],
        error: null,
      });
      mockSupabaseAdmin.__mockTable('pecas', { data: [PECA], error: null });
      mockSupabaseAdmin.__mockTable('users', { data: [COMPRADOR], error: null });

      const { vendas } = (await request(appVendedor).get('/api/pedidos/historico')).body;

      expect(vendas[0]).toMatchObject({
        visao: 'venda',
        pode_atualizar_status: true,
        comprador: { id: 42, nome: 'Maria' },
      });
    });

    it('a venda soma apenas os itens do proprio fornecedor', async () => {
      mockarUsuarioAtual(VENDEDOR);
      mockSupabaseAdmin.__mockTable('pedidos', {
        data: [pedidoSalvo({
          user_id: 42,
          total: 1250,
          itens: [
            { id: 10, quantidade: 2, preco: 350, fornecedor_id: 5 },
            { id: 11, quantidade: 1, preco: 550, fornecedor_id: 9 },
          ],
        })],
        error: null,
      });
      mockSupabaseAdmin.__mockTable('pecas', { data: [PECA], error: null });
      mockSupabaseAdmin.__mockTable('users', { data: [COMPRADOR], error: null });

      const { vendas } = (await request(appVendedor).get('/api/pedidos/historico')).body;

      expect(vendas[0].itens).toHaveLength(1);
      expect(vendas[0].valor_venda).toBe(700);
      expect(vendas[0].total_pedido).toBe(1250);
    });

    it('completa os itens com os dados atuais da peca', async () => {
      mockarUsuarioAtual(COMPRADOR);
      mockSupabaseAdmin.__mockTable('pedidos', {
        data: [pedidoSalvo({ itens: [{ id: 10, quantidade: 2 }] })],
        error: null,
      });
      mockSupabaseAdmin.__mockTable('pecas', { data: [PECA], error: null });
      mockSupabaseAdmin.__mockTable('users', { data: [VENDEDOR], error: null });

      const { compras } = (await request(appComprador).get('/api/pedidos/historico')).body;

      expect(compras[0].itens[0]).toMatchObject({
        nome: 'Friso Opala',
        preco: 350,
        imagem: 'friso.png',
        sku: 'FR-1',
        fornecedor_id: 5,
        fornecedor_nome: 'Loja do Zé',
      });
    });

    it('usa rotulos padrao quando a peca ou o fornecedor sumiram', async () => {
      mockarUsuarioAtual(COMPRADOR);
      mockSupabaseAdmin.__mockTable('pedidos', {
        data: [pedidoSalvo({ itens: [{ id: 999, quantidade: 1 }] })],
        error: null,
      });
      mockSupabaseAdmin.__mockTable('pecas', { data: [], error: null });
      mockSupabaseAdmin.__mockTable('users', { data: [], error: null });

      const { compras } = (await request(appComprador).get('/api/pedidos/historico')).body;

      expect(compras[0].itens[0]).toMatchObject({
        nome: 'Peça',
        preco: 0,
        quantidade: 1,
        fornecedor_id: null,
        fornecedor_nome: 'Usuário BigPeças',
      });
    });

    it('responde 404 quando o email autenticado nao tem perfil', async () => {
      mockarUsuarioAtual(null);

      const resposta = await request(appComprador).get('/api/pedidos/historico');

      expect(resposta.status).toBe(404);
    });

    it('responde 401 sem usuario autenticado', async () => {
      const resposta = await request(buildTestApp(pedidosRoutes, { basePath: '/api/pedidos' }))
        .get('/api/pedidos/historico');

      expect(resposta.status).toBe(401);
    });
  });

  describe('GET /', () => {
    it('devolve apenas as compras do usuario', async () => {
      mockarUsuarioAtual(COMPRADOR);
      mockSupabaseAdmin.__mockTable('pedidos', {
        data: [pedidoSalvo(), pedidoSalvo({ id: 'de-outro', user_id: 99 })],
        error: null,
      });
      mockSupabaseAdmin.__mockTable('pecas', { data: [PECA], error: null });
      mockSupabaseAdmin.__mockTable('users', { data: [VENDEDOR], error: null });

      const resposta = await request(appComprador).get('/api/pedidos');

      expect(Array.isArray(resposta.body)).toBe(true);
      expect(resposta.body.map((p) => p.id)).toEqual(['2026-100200']);
      expect(resposta.body[0].visao).toBe('compra');
    });
  });

  describe('GET /:id', () => {
    function mockarPedido(pedido) {
      mockSupabaseAdmin.__queueTable('pedidos', { data: pedido, error: null });
      mockSupabaseAdmin.__mockTable('pecas', { data: [PECA], error: null });
    }

    it('devolve a visao de compra para o dono do pedido', async () => {
      mockarUsuarioAtual(COMPRADOR);
      mockarPedido(pedidoSalvo());
      mockSupabaseAdmin.__mockTable('users', { data: [VENDEDOR], error: null });

      const resposta = await request(appComprador).get('/api/pedidos/2026-100200');

      expect(resposta.status).toBe(200);
      expect(resposta.body).toMatchObject({
        visao: 'compra',
        pode_atualizar_status: false,
        valor_transacao: 730,
      });
    });

    it('devolve a visao de venda para o fornecedor', async () => {
      mockarUsuarioAtual(VENDEDOR);
      mockarPedido(pedidoSalvo());
      mockSupabaseAdmin.__mockTable('users', { data: [COMPRADOR], error: null });

      const resposta = await request(appVendedor).get('/api/pedidos/2026-100200');

      expect(resposta.body).toMatchObject({ visao: 'venda', pode_atualizar_status: true });
    });

    it('permite ao comprador pedir explicitamente a visao de venda', async () => {
      const usuarioAmbos = { ...COMPRADOR, id: 5 };
      mockarUsuarioAtual(usuarioAmbos);
      mockarPedido(pedidoSalvo({ user_id: 5 }));
      mockSupabaseAdmin.__mockTable('users', { data: [usuarioAmbos], error: null });

      const resposta = await request(appComprador).get('/api/pedidos/2026-100200?visao=venda');

      expect(resposta.body.visao).toBe('venda');
    });

    it('responde 404 quando o pedido nao existe', async () => {
      mockarUsuarioAtual(COMPRADOR);
      mockSupabaseAdmin.__queueTable('pedidos', { data: null, error: null });

      const resposta = await request(appComprador).get('/api/pedidos/inexistente');

      expect(resposta.status).toBe(404);
    });

    it('esconde o pedido de quem nao e comprador nem fornecedor', async () => {
      mockarUsuarioAtual({ ...COMPRADOR, id: 77, email: 'bisbilhoteiro@bigpecas.com' });
      mockarPedido(pedidoSalvo());
      mockSupabaseAdmin.__mockTable('users', { data: [COMPRADOR], error: null });

      const resposta = await request(appComprador).get('/api/pedidos/2026-100200');

      expect(resposta.status).toBe(404);
    });
  });

  describe('POST /', () => {
    const corpoValido = {
      itens: [{ id: 10, quantidade: 2 }],
      frete: { valor: 30 },
      endereco: { cep: '01310100' },
      forma_pagamento: { nome: 'Pix' },
    };

    function mockarCriacao(pecas = [PECA]) {
      mockarUsuarioAtual(COMPRADOR);
      mockSupabaseAdmin.__mockTable('pecas', { data: pecas, error: null });
      mockSupabaseAdmin.__mockTable('users', { data: [VENDEDOR], error: null });
      mockSupabaseAdmin.__mockTable('pedidos', { data: pedidoSalvo(), error: null });
    }

    function pedidoInserido() {
      return mockSupabaseAdmin.__callsFor('pedidos')[0].argumentos('insert')[0];
    }

    it('cria o pedido com subtotal, frete e total calculados no servidor', async () => {
      mockarCriacao();

      const resposta = await request(appComprador).post('/api/pedidos').send(corpoValido);

      expect(resposta.status).toBe(201);
      expect(pedidoInserido()).toMatchObject({
        user_id: 42,
        status: 'aguardando_pagamento',
        subtotal: 700,
        desconto: 0,
        valor_frete: 30,
        total: 730,
      });
    });

    it('usa o preco atual da peca, ignorando o preco enviado pelo cliente', async () => {
      mockarCriacao();

      await request(appComprador).post('/api/pedidos').send({
        ...corpoValido,
        itens: [{ id: 10, quantidade: 2, preco: 1 }],
      });

      expect(pedidoInserido().itens[0].preco).toBe(350);
      expect(pedidoInserido().subtotal).toBe(700);
    });

    it('gera numero de pedido e codigo de rastreio no formato esperado', async () => {
      mockarCriacao();

      await request(appComprador).post('/api/pedidos').send(corpoValido);

      expect(pedidoInserido().id).toMatch(/^\d{4}-\d{6}$/);
      expect(pedidoInserido().codigo_rastreio).toMatch(/^BG\d{9}[A-Z]{2}$/);
    });

    it('inicia o historico com o status de aguardando pagamento', async () => {
      mockarCriacao();

      await request(appComprador).post('/api/pedidos').send(corpoValido);

      expect(pedidoInserido().historico).toEqual([
        { status: 'aguardando_pagamento', data: expect.any(String) },
      ]);
    });

    it('aplica cupom percentual sobre o subtotal', async () => {
      mockarCriacao();

      await request(appComprador).post('/api/pedidos').send({
        ...corpoValido,
        cupom: { tipo: 'percentual', valor: 0.1 },
      });

      expect(pedidoInserido()).toMatchObject({ desconto: 70, valor_frete: 30, total: 660 });
    });

    // ATENCAO: comportamento atual, provavelmente indesejado. O cupom de frete
    // gratis zera `valor_frete` E lanca o mesmo valor em `desconto`, entao o
    // frete acaba abatido duas vezes (total = 700 - 30 + 0 em vez de 700).
    it('aplica cupom de frete gratis, hoje descontando o frete duas vezes do total', async () => {
      mockarCriacao();

      await request(appComprador).post('/api/pedidos').send({
        ...corpoValido,
        cupom: { tipo: 'frete_gratis' },
      });

      expect(pedidoInserido()).toMatchObject({
        subtotal: 700,
        desconto: 30,
        valor_frete: 0,
        total: 670,
      });
    });

    it('nunca deixa o total ficar negativo', async () => {
      mockarCriacao();

      await request(appComprador).post('/api/pedidos').send({
        ...corpoValido,
        frete: { valor: 0 },
        cupom: { tipo: 'percentual', valor: 2 },
      });

      expect(pedidoInserido().total).toBe(0);
    });

    it('gera as vendas do pedido logo apos a criacao', async () => {
      mockarCriacao();

      await request(appComprador).post('/api/pedidos').send(corpoValido);

      expect(mockGarantirVendasDoPedido).toHaveBeenCalledWith(
        expect.objectContaining({ id: '2026-100200' }),
      );
    });

    it.each([
      ['sem itens', { ...corpoValido, itens: [] }, 'O pedido deve conter ao menos um item.'],
      ['com itens invalidos', { ...corpoValido, itens: 'dois' }, 'O pedido deve conter ao menos um item.'],
      ['sem endereco', { ...corpoValido, endereco: null }, 'Endereço de entrega é obrigatório.'],
      ['sem forma de pagamento', { ...corpoValido, forma_pagamento: null }, 'Forma de pagamento é obrigatória.'],
    ])('recusa pedido %s com 400', async (_descricao, corpo, mensagem) => {
      mockarUsuarioAtual(COMPRADOR);

      const resposta = await request(appComprador).post('/api/pedidos').send(corpo);

      expect(resposta.status).toBe(400);
      expect(resposta.body.error).toBe(mensagem);
      expect(mockSupabaseAdmin.__callsFor('pedidos')).toHaveLength(0);
    });

    it('recusa quando alguma peca do carrinho nao existe mais', async () => {
      mockarCriacao([]);

      const resposta = await request(appComprador).post('/api/pedidos').send(corpoValido);

      expect(resposta.status).toBe(400);
      expect(resposta.body.error).toBe('Uma ou mais peças do pedido não estão mais disponíveis.');
    });

    it('recusa quando a quantidade pedida excede o estoque', async () => {
      mockarCriacao([{ ...PECA, estoque_atual: 1 }]);

      const resposta = await request(appComprador).post('/api/pedidos').send(corpoValido);

      expect(resposta.status).toBe(409);
      expect(resposta.body.error).toContain('Estoque insuficiente');
    });

    it.each([[0], [-1], [1.5], ['duas']])(
      'recusa a quantidade invalida %p com 400',
      async (quantidade) => {
        mockarCriacao();

        const resposta = await request(appComprador).post('/api/pedidos').send({
          ...corpoValido,
          itens: [{ id: 10, quantidade }],
        });

        expect(resposta.status).toBe(400);
        expect(resposta.body.error).toBe('Informe uma quantidade válida para cada peça.');
      },
    );

    it('recusa peca sem fornecedor vinculado com 409', async () => {
      mockarCriacao([{ ...PECA, fornecedor_id: null }]);

      const resposta = await request(appComprador).post('/api/pedidos').send(corpoValido);

      expect(resposta.status).toBe(409);
      expect(resposta.body.error).toContain('não possui um fornecedor vinculado');
    });
  });

  describe('PATCH /:id/status', () => {
    function mockarTransicao(pedidoAtual, pedidoAtualizado = null) {
      mockSupabaseAdmin.__queueTable(
        'pedidos',
        { data: pedidoAtual, error: null },
        { data: pedidoAtualizado || { ...pedidoAtual, status: 'novo' }, error: null },
      );
      mockSupabaseAdmin.__mockTable('pecas', { data: [PECA], error: null });
    }

    it('deixa o fornecedor avancar de pago para enviado', async () => {
      mockarUsuarioAtual(VENDEDOR);
      const atual = pedidoSalvo({ status: 'pago' });
      mockarTransicao(atual, { ...atual, status: 'enviado' });
      mockSupabaseAdmin.__mockTable('users', { data: [COMPRADOR], error: null });

      const resposta = await request(appVendedor)
        .patch('/api/pedidos/2026-100200/status')
        .send({ status: 'enviado' });

      expect(resposta.status).toBe(200);
      expect(resposta.body.visao).toBe('venda');

      const atualizacao = mockSupabaseAdmin.__callsFor('pedidos')[1];
      expect(atualizacao.argumentos('update')[0].status).toBe('enviado');
      expect(atualizacao.argumentos('update')[0].historico).toHaveLength(2);
    });

    it('sincroniza o status nas vendas apos a atualizacao', async () => {
      mockarUsuarioAtual(VENDEDOR);
      const atual = pedidoSalvo({ status: 'pago' });
      mockarTransicao(atual, { ...atual, status: 'enviado' });
      mockSupabaseAdmin.__mockTable('users', { data: [COMPRADOR], error: null });

      await request(appVendedor).patch('/api/pedidos/2026-100200/status').send({ status: 'enviado' });

      expect(mockSincronizarStatusVendas).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'enviado' }),
      );
    });

    it('deixa o comprador confirmar o pagamento do proprio pedido', async () => {
      mockarUsuarioAtual(COMPRADOR);
      const atual = pedidoSalvo({ status: 'aguardando_pagamento' });
      mockarTransicao(atual, { ...atual, status: 'pago' });
      mockSupabaseAdmin.__mockTable('users', { data: [COMPRADOR, VENDEDOR], error: null });

      const resposta = await request(appComprador)
        .patch('/api/pedidos/2026-100200/status')
        .send({ status: 'pago' });

      expect(resposta.status).toBe(200);
      expect(resposta.body.visao).toBe('compra');
    });

    it('deixa o comprador confirmar o recebimento', async () => {
      mockarUsuarioAtual(COMPRADOR);
      const atual = pedidoSalvo({ status: 'enviado' });
      mockarTransicao(atual, { ...atual, status: 'entregue' });
      mockSupabaseAdmin.__mockTable('users', { data: [COMPRADOR], error: null });

      const resposta = await request(appComprador)
        .patch('/api/pedidos/2026-100200/status')
        .send({ status: 'entregue' });

      expect(resposta.status).toBe(200);
    });

    it('impede o fornecedor de marcar o pedido como entregue', async () => {
      mockarUsuarioAtual(VENDEDOR);
      mockarTransicao(pedidoSalvo({ status: 'enviado' }));
      mockSupabaseAdmin.__mockTable('users', { data: [COMPRADOR], error: null });

      const resposta = await request(appVendedor)
        .patch('/api/pedidos/2026-100200/status')
        .send({ status: 'entregue' });

      expect(resposta.status).toBe(403);
      expect(resposta.body.error).toBe('Somente o comprador pode confirmar o recebimento do pedido.');
    });

    it('impede quem nao participa do pedido de mudar o status', async () => {
      mockarUsuarioAtual({ id: 77, email: 'estranho@bigpecas.com' });
      mockarTransicao(pedidoSalvo({ status: 'pago' }));
      mockSupabaseAdmin.__mockTable('users', { data: [COMPRADOR], error: null });

      const resposta = await request(appComprador)
        .patch('/api/pedidos/2026-100200/status')
        .send({ status: 'enviado' });

      expect(resposta.status).toBe(403);
      expect(resposta.body.error).toContain('Somente um fornecedor deste pedido');
    });

    it.each([
      ['aguardando_pagamento', 'enviado'],
      ['entregue', 'cancelado'],
      ['cancelado', 'pago'],
    ])('bloqueia a transicao de %s para %s com 409', async (statusAtual, novoStatus) => {
      mockarUsuarioAtual(VENDEDOR);
      mockarTransicao(pedidoSalvo({ status: statusAtual }));
      mockSupabaseAdmin.__mockTable('users', { data: [COMPRADOR], error: null });

      const resposta = await request(appVendedor)
        .patch('/api/pedidos/2026-100200/status')
        .send({ status: novoStatus });

      expect(resposta.status).toBe(409);
      expect(resposta.body.error).toBe('Essa alteração de status não é permitida para o pedido atual.');
    });

    it('impede o comprador de pular o envio, confirmando o recebimento de um pedido apenas pago', async () => {
      mockarUsuarioAtual(COMPRADOR);
      mockarTransicao(pedidoSalvo({ status: 'pago' }));
      mockSupabaseAdmin.__mockTable('users', { data: [COMPRADOR], error: null });

      const resposta = await request(appComprador)
        .patch('/api/pedidos/2026-100200/status')
        .send({ status: 'entregue' });

      expect(resposta.status).toBe(409);
      expect(resposta.body.error).toBe('Essa alteração de status não é permitida para o pedido atual.');
    });

    it.each([[undefined], ['entregando'], ['']])(
      'recusa o status invalido %p com 400',
      async (status) => {
        mockarUsuarioAtual(VENDEDOR);

        const resposta = await request(appVendedor)
          .patch('/api/pedidos/2026-100200/status')
          .send({ status });

        expect(resposta.status).toBe(400);
        expect(resposta.body.error).toContain('Status inválido');
      },
    );

    it('responde 404 quando o pedido nao existe', async () => {
      mockarUsuarioAtual(VENDEDOR);
      mockSupabaseAdmin.__queueTable('pedidos', { data: null, error: null });

      const resposta = await request(appVendedor)
        .patch('/api/pedidos/inexistente/status')
        .send({ status: 'pago' });

      expect(resposta.status).toBe(404);
    });

    describe('notificacoes por e-mail', () => {
      function prepararPagamento() {
        mockarUsuarioAtual(COMPRADOR);
        const atual = pedidoSalvo({ status: 'aguardando_pagamento' });
        mockarTransicao(atual, { ...atual, status: 'pago' });
        mockSupabaseAdmin.__mockTable('users', { data: [COMPRADOR, VENDEDOR], error: null });
      }

      it('avisa o cliente sobre a mudanca de status', async () => {
        prepararPagamento();

        await request(appComprador).patch('/api/pedidos/2026-100200/status').send({ status: 'pago' });

        expect(mockEnviarNotificacaoStatusPedidoCliente).toHaveBeenCalledWith(
          expect.objectContaining({
            to: 'cliente@bigpecas.com',
            clienteNome: 'Maria',
            statusAnterior: 'aguardando_pagamento',
            statusAtual: 'pago',
            codigoRastreio: 'BG123456789AB',
          }),
        );
      });

      it('avisa cada vendedor quando o pedido e pago', async () => {
        prepararPagamento();

        await request(appComprador).patch('/api/pedidos/2026-100200/status').send({ status: 'pago' });

        expect(mockEnviarNotificacaoVendaVendedor).toHaveBeenCalledWith(
          expect.objectContaining({
            to: 'vendedor@bigpecas.com',
            vendedorNome: 'Loja do Zé',
            clienteNome: 'Maria',
            valorTotal: 700,
          }),
        );
      });

      it('nao avisa vendedores em transicoes que nao sao de pagamento', async () => {
        mockarUsuarioAtual(VENDEDOR);
        const atual = pedidoSalvo({ status: 'pago' });
        mockarTransicao(atual, { ...atual, status: 'enviado' });
        mockSupabaseAdmin.__mockTable('users', { data: [COMPRADOR, VENDEDOR], error: null });

        await request(appVendedor).patch('/api/pedidos/2026-100200/status').send({ status: 'enviado' });

        expect(mockEnviarNotificacaoVendaVendedor).not.toHaveBeenCalled();
      });

      it('respeita o vendedor que desativou a notificacao de venda', async () => {
        mockarUsuarioAtual(COMPRADOR);
        const atual = pedidoSalvo({ status: 'aguardando_pagamento' });
        mockarTransicao(atual, { ...atual, status: 'pago' });
        mockSupabaseAdmin.__mockTable('users', {
          data: [COMPRADOR, { ...VENDEDOR, receber_email_notificacao_venda: false }],
          error: null,
        });

        await request(appComprador).patch('/api/pedidos/2026-100200/status').send({ status: 'pago' });

        expect(mockEnviarNotificacaoVendaVendedor).not.toHaveBeenCalled();
      });

      it('conclui a atualizacao mesmo quando o envio de e-mail falha', async () => {
        prepararPagamento();
        mockEnviarNotificacaoStatusPedidoCliente.mockRejectedValue(new Error('smtp fora do ar'));
        mockEnviarNotificacaoVendaVendedor.mockRejectedValue(new Error('smtp fora do ar'));

        const resposta = await request(appComprador)
          .patch('/api/pedidos/2026-100200/status')
          .send({ status: 'pago' });

        expect(resposta.status).toBe(200);
        expect(mockSincronizarStatusVendas).toHaveBeenCalled();
      });
    });
  });
});
