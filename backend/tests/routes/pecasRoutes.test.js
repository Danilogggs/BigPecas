const request = require('supertest');
const { createSupabaseMock } = require('../helpers/supabaseMock');

const mockSupabaseAdmin = createSupabaseMock();

jest.mock('../../src/config/supabaseClient', () => ({
  supabaseAdmin: mockSupabaseAdmin,
  supabasePublic: null,
}));

const pecasRoutes = require('../../src/routes/pecasRoutes');
const { buildTestApp } = require('../helpers/testApp');

const FORNECEDOR = {
  id: 5,
  email: 'vendedor@bigpecas.com',
  tipo_usuario: 'ambos',
  nome_loja: 'Loja do Zé',
  descricao_loja: 'Peças originais de Opala',
  email_verificado: true,
};

const PECA = {
  id: 10,
  nome_peca: 'Friso Opala',
  preco: 350,
  categoria_id: 1,
  material_id: 2,
  condicao: 'NOS',
  estoque_atual: 3,
  fornecedor_id: 5,
  status_publicacao: 'publicada',
};

/**
 * O catalogo publico nao le a tabela `pecas` diretamente: ele consulta a view
 * `precos_publicos_moeda`, que ja devolve o preco convertido em `preco_exibicao`.
 */
const VIEW_PUBLICA = 'precos_publicos_moeda';

const USUARIO_AUTENTICADO = {
  email: 'vendedor@bigpecas.com',
  email_confirmed_at: '2026-01-01T00:00:00.000Z',
};

function criarApp(user = USUARIO_AUTENTICADO) {
  return buildTestApp(pecasRoutes, { user, basePath: '/api/pecas' });
}

const app = criarApp();

/** Primeira consulta em `users`: resolve o fornecedor autenticado. */
function mockarFornecedor(data = FORNECEDOR) {
  mockSupabaseAdmin.__queueTable('users', { data, error: null });
}

describe('pecasRoutes', () => {
  beforeEach(() => {
    mockSupabaseAdmin.__reset();
  });

  describe('POST /cadastrar', () => {
    const corpoValido = {
      nome_peca: '  Friso Opala  ',
      sku: 'FR-1',
      categoria_id: '1',
      material_id: '2',
      preco: '350,50',
      estoque_atual: '3',
      peso_gramas: '800',
    };

    it('cadastra a peca normalizando os tipos e vinculando ao fornecedor', async () => {
      mockarFornecedor();
      mockSupabaseAdmin.__mockTable('pecas', { data: { id: 10, ...PECA }, error: null });

      const resposta = await request(app).post('/api/pecas/cadastrar').send(corpoValido);

      expect(resposta.status).toBe(201);
      expect(resposta.body.message).toBe(
        'Peça cadastrada e enviada para avaliação. Ela ficará pública após aprovação.',
      );

      const payload = mockSupabaseAdmin.__callsFor('pecas')[0].argumentos('insert')[0];
      expect(payload).toMatchObject({
        nome_peca: 'Friso Opala',
        categoria_id: 1,
        material_id: 2,
        preco: 350.5,
        estoque_atual: 3,
        peso_gramas: 800,
        condicao: 'NOS',
        fornecedor_id: 5,
      });
    });

    it('usa NOS como condicao padrao e zera o estoque quando nao informado', async () => {
      mockarFornecedor();
      mockSupabaseAdmin.__mockTable('pecas', { data: PECA, error: null });

      await request(app).post('/api/pecas/cadastrar').send({
        nome_peca: 'Roda',
        categoria_id: 1,
        material_id: 2,
        preco: 100,
      });

      expect(mockSupabaseAdmin.__callsFor('pecas')[0].argumentos('insert')[0]).toMatchObject({
        condicao: 'NOS',
        estoque_atual: 0,
      });
    });

    it.each([
      ['sem nome', { ...corpoValido, nome_peca: '' }, 'Informe o nome da peça.'],
      ['com preco zero', { ...corpoValido, preco: '0' }, 'Informe um preço válido para a peça.'],
      ['com preco invalido', { ...corpoValido, preco: 'abc' }, 'Informe um preço válido para a peça.'],
      ['sem categoria', { ...corpoValido, categoria_id: '' }, 'Informe a categoria da peça.'],
      ['sem material', { ...corpoValido, material_id: '' }, 'Informe o material da peça.'],
    ])('recusa cadastro %s com 400', async (_descricao, corpo, mensagem) => {
      mockarFornecedor();

      const resposta = await request(app).post('/api/pecas/cadastrar').send(corpo);

      expect(resposta.status).toBe(400);
      expect(resposta.body.error).toBe(mensagem);
      expect(mockSupabaseAdmin.__callsFor('pecas')).toHaveLength(0);
    });

    it.each([
      ['sem nome de loja', { ...FORNECEDOR, nome_loja: '' }],
      ['sem descricao de loja', { ...FORNECEDOR, descricao_loja: '   ' }],
    ])('exige o perfil de loja completo (%s) com 409', async (_descricao, fornecedor) => {
      mockarFornecedor(fornecedor);

      const resposta = await request(app).post('/api/pecas/cadastrar').send(corpoValido);

      expect(resposta.status).toBe(409);
      expect(resposta.body.error).toContain('nome e a descrição da sua loja');
    });

    it('exige e-mail confirmado no Supabase Auth', async () => {
      mockarFornecedor();

      const resposta = await request(criarApp({ email: FORNECEDOR.email }))
        .post('/api/pecas/cadastrar')
        .send(corpoValido);

      expect(resposta.status).toBe(403);
      expect(resposta.body.error).toBe('Confirme seu e-mail antes de cadastrar peças.');
    });

    it('responde 401 quando nao ha e-mail no token', async () => {
      const resposta = await request(criarApp({ id: 'sem-email' }))
        .post('/api/pecas/cadastrar')
        .send(corpoValido);

      expect(resposta.status).toBe(401);
    });

    it('responde 404 quando o fornecedor nao existe na tabela users', async () => {
      mockarFornecedor(null);

      const resposta = await request(app).post('/api/pecas/cadastrar').send(corpoValido);

      expect(resposta.status).toBe(404);
    });
  });

  describe('GET /', () => {
    it('aplica paginacao padrao e expoe os metadados nos headers', async () => {
      mockSupabaseAdmin.__mockTable(VIEW_PUBLICA, { data: [PECA], error: null, count: 137 });

      const resposta = await request(app).get('/api/pecas');

      expect(resposta.status).toBe(200);
      expect(resposta.headers['x-total-count']).toBe('137');
      expect(resposta.headers['x-page']).toBe('1');
      expect(resposta.headers['x-page-size']).toBe('40');
      expect(resposta.headers['access-control-expose-headers']).toContain('X-Total-Count');

      expect(mockSupabaseAdmin.__callsFor(VIEW_PUBLICA)[0].argumentos('range')).toEqual([0, 39]);
    });

    it('calcula o intervalo a partir de page e limit', async () => {
      mockSupabaseAdmin.__mockTable(VIEW_PUBLICA, { data: [], error: null, count: 0 });

      await request(app).get('/api/pecas?page=3&limit=10');

      expect(mockSupabaseAdmin.__callsFor(VIEW_PUBLICA)[0].argumentos('range')).toEqual([20, 29]);
    });

    it.each([
      ['limit acima do maximo', 'limit=500', [0, 99]],
      ['limit invalido', 'limit=abc', [0, 39]],
      ['page zero', 'page=0', [0, 39]],
      ['page negativa', 'page=-5', [0, 39]],
    ])('protege a paginacao contra %s', async (_descricao, query, esperado) => {
      mockSupabaseAdmin.__mockTable(VIEW_PUBLICA, { data: [], error: null, count: 0 });

      await request(app).get(`/api/pecas?${query}`);

      expect(mockSupabaseAdmin.__callsFor(VIEW_PUBLICA)[0].argumentos('range')).toEqual(esperado);
    });

    it('traduz os filtros da query em clausulas do Supabase', async () => {
      mockSupabaseAdmin.__mockTable(VIEW_PUBLICA, { data: [], error: null, count: 0 });

      await request(app).get(
        '/api/pecas?categoria_id=1&material_id=2&condicao=NOS&oem_number=OEM-9&num_serie=S1&nome=friso&min_preco=100&max_preco=900&min_estoque=1&fornecedor_id=5',
      );

      const [consulta] = mockSupabaseAdmin.__callsFor(VIEW_PUBLICA);
      const igualdades = consulta.operations.filter((op) => op.method === 'eq').map((op) => op.args);

      expect(igualdades).toEqual(expect.arrayContaining([
        ['fornecedor_id', 5],
        ['categoria_id', 1],
        ['material_id', 2],
        ['condicao', 'NOS'],
        ['oem_number', 'OEM-9'],
        ['num_serie', 'S1'],
      ]));
      expect(consulta.argumentos('ilike')).toEqual(['nome_peca', '%friso%']);
      expect(consulta.operations.filter((op) => op.method === 'gte').map((op) => op.args)).toEqual([
        ['preco_exibicao', 100],
        ['estoque_atual', 1],
      ]);
      expect(consulta.argumentos('lte')).toEqual(['preco_exibicao', 900]);
    });

    it('filtra pelo fornecedor autenticado quando minhas_pecas=true', async () => {
      mockarFornecedor();
      mockSupabaseAdmin.__mockTable('pecas', { data: [PECA], error: null, count: 1 });

      await request(app).get('/api/pecas?minhas_pecas=true');

      const consulta = mockSupabaseAdmin.__callsFor('pecas')[0];
      expect(consulta.argumentos('eq')).toEqual(['fornecedor_id', 5]);
      expect(consulta.argumentos('neq')).toEqual(['status_publicacao', 'arquivada']);
    });

    it.each([
      ['id', 'id'],
      ['preco', 'preco_exibicao'],
      ['data', 'data_cadastro'],
      ['estoque', 'estoque_atual'],
      ['nome', 'nome_peca'],
    ])('traduz sort=%s para a coluna %s', async (sort, coluna) => {
      mockSupabaseAdmin.__mockTable(VIEW_PUBLICA, { data: [], error: null, count: 0 });

      await request(app).get(`/api/pecas?sort=${sort}`);

      expect(mockSupabaseAdmin.__callsFor(VIEW_PUBLICA)[0].argumentos('order')[0]).toBe(coluna);
    });

    it('ordena pelo id quando sort nao e informado', async () => {
      mockSupabaseAdmin.__mockTable(VIEW_PUBLICA, { data: [], error: null, count: 0 });

      await request(app).get('/api/pecas');

      expect(mockSupabaseAdmin.__callsFor(VIEW_PUBLICA)[0].argumentos('order')[0]).toBe('id');
    });

    it.each([
      ['asc', true],
      ['ASC', true],
      ['desc', false],
    ])('traduz ordem=%s em ascending=%s', async (ordem, ascending) => {
      mockSupabaseAdmin.__mockTable(VIEW_PUBLICA, { data: [], error: null, count: 0 });

      await request(app).get(`/api/pecas?ordem=${ordem}`);

      expect(mockSupabaseAdmin.__callsFor(VIEW_PUBLICA)[0].argumentos('order')[1]).toEqual({ ascending });
    });

    it('deixa o ascending indefinido quando ordem nao e informada, caindo no padrao do supabase-js', async () => {
      mockSupabaseAdmin.__mockTable(VIEW_PUBLICA, { data: [], error: null, count: 0 });

      await request(app).get('/api/pecas');

      expect(mockSupabaseAdmin.__callsFor(VIEW_PUBLICA)[0].argumentos('order')[1]).toEqual({
        ascending: undefined,
      });
    });

    it('rejeita campo de ordenacao desconhecido, evitando injecao na query', async () => {
      const resposta = await request(app).get('/api/pecas?sort=preco;drop');

      expect(resposta.status).toBe(400);
      expect(resposta.body.error).toBe('O campo de ordenação informado é inválido.');
    });

    it('rejeita filtro numerico invalido informando o campo', async () => {
      const resposta = await request(app).get('/api/pecas?min_preco=barato');

      expect(resposta.status).toBe(400);
      expect(resposta.body.error).toBe('Informe um valor válido para preço mínimo.');
    });

    it('consulta a view publica de precos na moeda pedida', async () => {
      mockSupabaseAdmin.__mockTable(VIEW_PUBLICA, { data: [], error: null, count: 0 });

      await request(app).get('/api/pecas?moeda=USD');

      expect(mockSupabaseAdmin.__callsFor(VIEW_PUBLICA)[0].argumentos('eq')).toEqual([
        'moeda_exibicao',
        'USD',
      ]);
    });

    it('usa BRL como moeda de exibicao padrao', async () => {
      mockSupabaseAdmin.__mockTable(VIEW_PUBLICA, { data: [], error: null, count: 0 });

      await request(app).get('/api/pecas');

      expect(mockSupabaseAdmin.__callsFor(VIEW_PUBLICA)[0].argumentos('eq')).toEqual([
        'moeda_exibicao',
        'BRL',
      ]);
    });

    it('devolve lista vazia e total zero quando nao ha resultados', async () => {
      mockSupabaseAdmin.__mockTable(VIEW_PUBLICA, { data: null, error: null, count: null });

      const resposta = await request(app).get('/api/pecas');

      expect(resposta.body).toEqual([]);
      expect(resposta.headers['x-total-count']).toBe('0');
    });
  });

  describe('GET /:id', () => {
    it('devolve a peca encontrada', async () => {
      mockSupabaseAdmin.__mockTable('pecas', { data: PECA, error: null });

      const resposta = await request(app).get('/api/pecas/10');

      expect(resposta.status).toBe(200);
      expect(resposta.body).toEqual(PECA);
    });

    it('responde 404 quando a peca nao existe', async () => {
      mockSupabaseAdmin.__mockTable('pecas', { data: null, error: null });

      const resposta = await request(app).get('/api/pecas/999');

      expect(resposta.status).toBe(404);
      expect(resposta.body.error).toBe('Peça não encontrada.');
    });

    it.each(['0', '-3'])('rejeita o id "%s" com 400', async (id) => {
      const resposta = await request(app).get(`/api/pecas/${id}`);

      expect(resposta.status).toBe(400);
      expect(resposta.body.error).toBe('Informe um identificador válido.');
    });
  });

  describe('PUT /:id', () => {
    it('atualiza apenas os campos permitidos, ignorando os demais', async () => {
      mockarFornecedor();
      mockSupabaseAdmin.__queueTable(
        'pecas',
        { data: PECA, error: null },
        { data: { ...PECA, preco: 400 }, error: null },
      );

      const resposta = await request(app).put('/api/pecas/10').send({
        preco: '400,00',
        estoque_atual: '7',
        fornecedor_id: 999,
        id: 123,
      });

      expect(resposta.status).toBe(200);
      expect(mockSupabaseAdmin.__callsFor('pecas')[1].argumentos('update')[0]).toEqual({
        preco_base: 400,
        estoque_atual: 7,
      });
    });

    it('impede que um fornecedor edite a peca de outro', async () => {
      mockarFornecedor();
      mockSupabaseAdmin.__mockTable('pecas', { data: { ...PECA, fornecedor_id: 99 }, error: null });

      const resposta = await request(app).put('/api/pecas/10').send({ preco: 400 });

      expect(resposta.status).toBe(403);
      expect(resposta.body.error).toBe('Você só pode atualizar peças cadastradas por você.');
    });

    it('responde 404 quando a peca nao existe', async () => {
      mockarFornecedor();
      mockSupabaseAdmin.__mockTable('pecas', { data: null, error: null });

      const resposta = await request(app).put('/api/pecas/10').send({ preco: 400 });

      expect(resposta.status).toBe(404);
    });

    it.each([
      ['corpo vazio', {}, 'Informe ao menos um campo para atualizar.'],
      ['lista no lugar de objeto', [], 'Envie os dados da peça para continuar.'],
    ])('recusa %s com 400', async (_descricao, corpo, mensagem) => {
      mockarFornecedor();

      const resposta = await request(app).put('/api/pecas/10').send(corpo);

      expect(resposta.status).toBe(400);
      expect(resposta.body.error).toBe(mensagem);
    });

    it('recusa quando nenhum campo enviado e atualizavel', async () => {
      mockarFornecedor();
      mockSupabaseAdmin.__mockTable('pecas', { data: PECA, error: null });

      const resposta = await request(app).put('/api/pecas/10').send({ fornecedor_id: 99 });

      expect(resposta.status).toBe(400);
      expect(resposta.body.error).toBe('Informe ao menos um campo válido para atualizar.');
    });

    it('converte campo textual vazio em null', async () => {
      mockarFornecedor();
      mockSupabaseAdmin.__queueTable(
        'pecas',
        { data: PECA, error: null },
        { data: PECA, error: null },
      );

      await request(app).put('/api/pecas/10').send({ sku: '   ', oem_number: '' });

      expect(mockSupabaseAdmin.__callsFor('pecas')[1].argumentos('update')[0]).toEqual({
        sku: '',
        oem_number: null,
      });
    });
  });

  describe('DELETE /:id', () => {
    it('remove a peca do proprio fornecedor', async () => {
      mockarFornecedor();
      mockSupabaseAdmin.__queueTable('pecas', { data: PECA, error: null }, { error: null });

      const resposta = await request(app).delete('/api/pecas/10');

      expect(resposta.status).toBe(200);
      expect(resposta.body).toEqual({ message: 'Peça deletada com sucesso!' });
      expect(mockSupabaseAdmin.__callsFor('pecas')[1].argumentos('eq')).toEqual(['id', 10]);
    });

    it('impede a exclusao de peca de outro fornecedor', async () => {
      mockarFornecedor();
      mockSupabaseAdmin.__mockTable('pecas', { data: { ...PECA, fornecedor_id: 99 }, error: null });

      const resposta = await request(app).delete('/api/pecas/10');

      expect(resposta.status).toBe(403);
      expect(mockSupabaseAdmin.__callsFor('pecas').some((c) => c.operacao('delete'))).toBe(false);
    });

    it('responde 404 quando a peca ja nao existe', async () => {
      mockarFornecedor();
      mockSupabaseAdmin.__mockTable('pecas', { data: null, error: null });

      expect((await request(app).delete('/api/pecas/10')).status).toBe(404);
    });
  });

  describe('GET /fornecedores/recomendados', () => {
    const LOJA_A = { ...FORNECEDOR, id: 5, nome_loja: 'Loja A', telefone: '11999999999' };
    const LOJA_B = { ...FORNECEDOR, id: 6, nome_loja: 'Loja B', telefone: null, email_verificado: false };

    it('ordena os fornecedores pelo score e limita o resultado', async () => {
      mockSupabaseAdmin.__queueTable('users', { data: [LOJA_A, LOJA_B], error: null });
      mockSupabaseAdmin.__mockTable('pecas', {
        data: [
          { id: 1, fornecedor_id: 6, estoque_atual: 0 },
          { id: 2, fornecedor_id: 5, estoque_atual: 4 },
          { id: 3, fornecedor_id: 5, estoque_atual: 1 },
        ],
        error: null,
      });

      const resposta = await request(app).get('/api/pecas/fornecedores/recomendados');

      expect(resposta.status).toBe(200);
      expect(resposta.body.total).toBe(2);
      expect(resposta.body.fornecedores[0]).toMatchObject({
        id: 5,
        total_pecas: 2,
        pecas_com_estoque: 2,
      });
      expect(resposta.body.fornecedores[0].score_recomendacao)
        .toBeGreaterThan(resposta.body.fornecedores[1].score_recomendacao);
    });

    it('respeita o parametro limite', async () => {
      mockSupabaseAdmin.__queueTable('users', { data: [LOJA_A, LOJA_B], error: null });
      mockSupabaseAdmin.__mockTable('pecas', {
        data: [{ id: 1, fornecedor_id: 5, estoque_atual: 1 }, { id: 2, fornecedor_id: 6, estoque_atual: 1 }],
        error: null,
      });

      const resposta = await request(app).get('/api/pecas/fornecedores/recomendados?limite=1');

      expect(resposta.body.fornecedores).toHaveLength(1);
    });

    it('descarta fornecedores sem nenhuma peca cadastrada', async () => {
      mockSupabaseAdmin.__queueTable('users', { data: [LOJA_A, LOJA_B], error: null });
      mockSupabaseAdmin.__mockTable('pecas', {
        data: [{ id: 1, fornecedor_id: 5, estoque_atual: 1 }],
        error: null,
      });

      const resposta = await request(app).get('/api/pecas/fornecedores/recomendados');

      expect(resposta.body.fornecedores.map((f) => f.id)).toEqual([5]);
    });

    it('nao consulta pecas quando nenhum usuario tem loja configurada', async () => {
      mockSupabaseAdmin.__queueTable('users', {
        data: [{ id: 7, nome_loja: '', descricao_loja: '' }],
        error: null,
      });

      const resposta = await request(app).get('/api/pecas/fornecedores/recomendados');

      expect(resposta.body).toEqual({ total: 0, fornecedores: [] });
      expect(mockSupabaseAdmin.__callsFor('pecas')).toHaveLength(0);
    });
  });

  describe('GET /fornecedores/:id/perfil', () => {
    it('devolve o perfil publico com as pecas do fornecedor', async () => {
      mockSupabaseAdmin.__queueTable('users', { data: FORNECEDOR, error: null });
      mockSupabaseAdmin.__mockTable('pecas', {
        data: [{ ...PECA, estoque_atual: 0 }, { ...PECA, id: 11, estoque_atual: 2 }],
        error: null,
      });

      const resposta = await request(app).get('/api/pecas/fornecedores/5/perfil');

      expect(resposta.status).toBe(200);
      expect(resposta.body.fornecedor).toMatchObject({
        id: 5,
        nome_loja: 'Loja do Zé',
        total_pecas: 2,
        pecas_com_estoque: 1,
      });
      expect(resposta.body.pecas).toHaveLength(2);
    });

    it('nao expoe usuarios sem perfil de vendedor', async () => {
      mockSupabaseAdmin.__queueTable('users', {
        data: { id: 9, nome_loja: '', descricao_loja: '' },
        error: null,
      });

      const resposta = await request(app).get('/api/pecas/fornecedores/9/perfil');

      expect(resposta.status).toBe(404);
      expect(resposta.body.error).toBe('Este usuário não possui perfil de vendedor.');
    });

    it('responde 404 quando o fornecedor nao existe', async () => {
      mockSupabaseAdmin.__queueTable('users', { data: null, error: null });

      const resposta = await request(app).get('/api/pecas/fornecedores/99/perfil');

      expect(resposta.status).toBe(404);
      expect(resposta.body.error).toBe('Fornecedor não encontrado.');
    });
  });

  describe('GET /:id/recomendacoes', () => {
    it('pontua e ordena as pecas semelhantes', async () => {
      const mesmaCategoria = { id: 11, nome_peca: 'Friso Caravan', categoria_id: 1, material_id: 2, condicao: 'NOS', preco: 360, fornecedor_id: 5 };
      const soCondicao = { id: 12, nome_peca: 'Volante', categoria_id: 9, material_id: 9, condicao: 'NOS', preco: 2000, fornecedor_id: 8 };

      mockSupabaseAdmin.__queueTable(
        'pecas',
        { data: PECA, error: null },
        { data: [soCondicao, mesmaCategoria], error: null },
      );

      const resposta = await request(app).get('/api/pecas/10/recomendacoes');

      expect(resposta.status).toBe(200);
      expect(resposta.body.peca_base_id).toBe(10);
      expect(resposta.body.recomendacoes.map((peca) => peca.id)).toEqual([11, 12]);
      expect(resposta.body.recomendacoes[0].score_recomendacao).toBeGreaterThan(
        resposta.body.recomendacoes[1].score_recomendacao,
      );
    });

    it('busca somente pecas com estoque, excluindo a propria peca base', async () => {
      mockSupabaseAdmin.__queueTable('pecas', { data: PECA, error: null }, { data: [], error: null });

      await request(app).get('/api/pecas/10/recomendacoes');

      const consulta = mockSupabaseAdmin.__callsFor('pecas')[1];
      expect(consulta.argumentos('neq')).toEqual(['id', 10]);
      expect(consulta.argumentos('gt')).toEqual(['estoque_atual', 0]);
      expect(consulta.argumentos('or')[0]).toBe('categoria_id.eq.1,material_id.eq.2,condicao.eq.NOS');
    });

    it('descarta candidatas com score zero', async () => {
      mockSupabaseAdmin.__queueTable(
        'pecas',
        { data: PECA, error: null },
        { data: [{ id: 12, nome_peca: 'Lanterna', categoria_id: 9, material_id: 9, condicao: 'USADO', preco: 50, fornecedor_id: 8 }], error: null },
      );

      const resposta = await request(app).get('/api/pecas/10/recomendacoes');

      expect(resposta.body).toEqual({ peca_base_id: 10, total: 0, recomendacoes: [] });
    });

    it('responde 404 quando a peca base nao existe', async () => {
      mockSupabaseAdmin.__queueTable('pecas', { data: null, error: null });

      const resposta = await request(app).get('/api/pecas/10/recomendacoes');

      expect(resposta.status).toBe(404);
      expect(resposta.body.error).toContain('Peça base não encontrada');
    });

    it('respeita o parametro limite', async () => {
      const candidata = (id) => ({ id, nome_peca: 'Friso', categoria_id: 1, material_id: 2, condicao: 'NOS', preco: 350, fornecedor_id: 5 });

      mockSupabaseAdmin.__queueTable(
        'pecas',
        { data: PECA, error: null },
        { data: [candidata(11), candidata(12), candidata(13)], error: null },
      );

      const resposta = await request(app).get('/api/pecas/10/recomendacoes?limite=2');

      expect(resposta.body.recomendacoes).toHaveLength(2);
    });
  });
});
