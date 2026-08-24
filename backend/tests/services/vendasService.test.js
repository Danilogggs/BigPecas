const { createSupabaseMock } = require('../helpers/supabaseMock');

const mockSupabaseAdmin = createSupabaseMock();

jest.mock('../../src/config/supabaseClient', () => ({
  supabaseAdmin: mockSupabaseAdmin,
  supabasePublic: null,
}));

const {
  garantirVendasDoPedido,
  sincronizarStatusVendas,
} = require('../../src/services/vendasService');
const AppError = require('../../src/utils/AppError');

const PECA_FRISO = { id: 10, nome_peca: 'Friso Opala', preco: 350, imagem: 'friso.png', sku: 'FR-1', fornecedor_id: 5 };
const PECA_RODA = { id: 11, nome_peca: 'Roda Weber', preco: 900, imagem: null, sku: null, fornecedor_id: 6 };

function pedidoBase(overrides = {}) {
  return {
    id: '2026-100200',
    user_id: 42,
    status: 'pago',
    total: 1250,
    forma_pagamento: { nome: 'Cartão de crédito' },
    historico: [{ status: 'aguardando_pagamento', data: '2026-01-01T10:00:00.000Z' }],
    itens: [{ id: 10, quantidade: 2 }],
    ...overrides,
  };
}

function mockarBuscas({ pecas = [PECA_FRISO], usuarios = [{ id: 5, nome_loja: 'Loja do Zé' }] } = {}) {
  mockSupabaseAdmin.__mockTable('pecas', { data: pecas, error: null });
  mockSupabaseAdmin.__mockTable('users', { data: usuarios, error: null });
}

function linhasEnviadasParaVendas() {
  const [upsert] = mockSupabaseAdmin.__callsFor('vendas');
  return upsert.argumentos('upsert')[0];
}

describe('vendasService', () => {
  beforeEach(() => {
    mockSupabaseAdmin.__reset();
  });

  describe('garantirVendasDoPedido', () => {
    it('cria uma linha de venda por item e devolve o pedido com os venda_id', async () => {
      mockarBuscas();
      mockSupabaseAdmin.__mockTable('vendas', {
        data: [{ id: 'venda-1', pedido_id: '2026-100200', item_indice: 0 }],
        error: null,
      });
      mockSupabaseAdmin.__mockTable('pedidos', { data: null, error: null });

      const pedido = await garantirVendasDoPedido(pedidoBase());

      expect(pedido.itens).toEqual([
        expect.objectContaining({
          id: 10,
          nome: 'Friso Opala',
          preco: 350,
          quantidade: 2,
          fornecedor_id: 5,
          fornecedor_nome: 'Loja do Zé',
          venda_id: 'venda-1',
        }),
      ]);
      expect(pedido.itens[0]).not.toHaveProperty('item_indice');
    });

    it('monta a linha de venda com o total calculado e os dados do pagamento', async () => {
      mockarBuscas();
      mockSupabaseAdmin.__mockTable('vendas', { data: [], error: null });
      mockSupabaseAdmin.__mockTable('pedidos', { data: null, error: null });

      await garantirVendasDoPedido(pedidoBase({
        forma_pagamento: {
          nome: 'Cartão',
          numero_parcelas: 3,
          primeira_parcela_data: '2026-02-10',
          juros_percentual: 1.99,
        },
      }));

      expect(linhasEnviadasParaVendas()).toEqual([
        expect.objectContaining({
          pedido_id: '2026-100200',
          item_indice: 0,
          peca_id: 10,
          fornecedor_id: 5,
          comprador_id: 42,
          quantidade: 2,
          preco_unitario: 350,
          preco_total: 700,
          forma_pagamento: 'Cartão',
          parcelado: true,
          numero_parcelas: 3,
          primeira_parcela_data: '2026-02-10',
          juros_percentual: 1.99,
          status: 'pago',
          data_entrega: null,
          cancelled_at: null,
        }),
      ]);
    });

    it('usa a data do historico quando o pedido ja foi entregue', async () => {
      mockarBuscas();
      mockSupabaseAdmin.__mockTable('vendas', { data: [], error: null });
      mockSupabaseAdmin.__mockTable('pedidos', { data: null, error: null });

      await garantirVendasDoPedido(pedidoBase({
        status: 'entregue',
        historico: [
          { status: 'entregue', data: '2026-01-05T10:00:00.000Z' },
          { status: 'entregue', data: '2026-01-09T18:30:00.000Z' },
        ],
      }));

      expect(linhasEnviadasParaVendas()[0]).toMatchObject({
        status: 'entregue',
        data_entrega: '2026-01-09T18:30:00.000Z',
        cancelled_at: null,
      });
    });

    it('registra a data de cancelamento quando o pedido foi cancelado', async () => {
      mockarBuscas();
      mockSupabaseAdmin.__mockTable('vendas', { data: [], error: null });
      mockSupabaseAdmin.__mockTable('pedidos', { data: null, error: null });

      await garantirVendasDoPedido(pedidoBase({
        status: 'cancelado',
        historico: [{ status: 'cancelado', data: '2026-01-06T12:00:00.000Z' }],
      }));

      expect(linhasEnviadasParaVendas()[0]).toMatchObject({
        cancelled_at: '2026-01-06T12:00:00.000Z',
        data_entrega: null,
      });
    });

    it.each([
      [{ nome: 'Pix' }, 'Pix'],
      [{ label: 'Boleto' }, 'Boleto'],
      [{ tipo: 'debito' }, 'debito'],
      [{ id: 'cartao-1' }, 'cartao-1'],
      [{}, 'Não informado'],
      ['Pix copia e cola', 'Pix copia e cola'],
    ])('normaliza a forma de pagamento %p em "%s"', async (formaPagamento, esperado) => {
      mockarBuscas();
      mockSupabaseAdmin.__mockTable('vendas', { data: [], error: null });
      mockSupabaseAdmin.__mockTable('pedidos', { data: null, error: null });

      await garantirVendasDoPedido(pedidoBase({ forma_pagamento: formaPagamento }));

      expect(linhasEnviadasParaVendas()[0].forma_pagamento).toBe(esperado);
    });

    it('limita a forma de pagamento a 100 caracteres', async () => {
      mockarBuscas();
      mockSupabaseAdmin.__mockTable('vendas', { data: [], error: null });
      mockSupabaseAdmin.__mockTable('pedidos', { data: null, error: null });

      await garantirVendasDoPedido(pedidoBase({ forma_pagamento: 'x'.repeat(250) }));

      expect(linhasEnviadasParaVendas()[0].forma_pagamento).toHaveLength(100);
    });

    it.each([
      [{ nome_loja: 'Loja do Zé', full_name: 'José', email: 'ze@bigpecas.com' }, 'Loja do Zé'],
      [{ full_name: 'José', email: 'ze@bigpecas.com' }, 'José'],
      [{ email: 'ze@bigpecas.com' }, 'ze@bigpecas.com'],
      [{}, 'Vendedor BigPeças'],
    ])('resolve o nome do fornecedor a partir de %p', async (dadosFornecedor, esperado) => {
      mockarBuscas({ usuarios: [{ id: 5, ...dadosFornecedor }] });
      mockSupabaseAdmin.__mockTable('vendas', { data: [], error: null });
      mockSupabaseAdmin.__mockTable('pedidos', { data: null, error: null });

      const pedido = await garantirVendasDoPedido(pedidoBase());

      expect(pedido.itens[0].fornecedor_nome).toBe(esperado);
    });

    it('preserva nome, preco e imagem informados no item em vez dos da peca', async () => {
      mockarBuscas();
      mockSupabaseAdmin.__mockTable('vendas', { data: [], error: null });
      mockSupabaseAdmin.__mockTable('pedidos', { data: null, error: null });

      const pedido = await garantirVendasDoPedido(pedidoBase({
        itens: [{ id: 10, quantidade: 1, nome: 'Friso (promoção)', preco: 199, imagem: 'promo.png' }],
      }));

      expect(pedido.itens[0]).toMatchObject({
        nome: 'Friso (promoção)',
        preco: 199,
        imagem: 'promo.png',
      });
    });

    it('agrupa itens de fornecedores diferentes no mesmo pedido', async () => {
      mockarBuscas({
        pecas: [PECA_FRISO, PECA_RODA],
        usuarios: [{ id: 5, nome_loja: 'Loja do Zé' }, { id: 6, nome_loja: 'Weber Parts' }],
      });
      mockSupabaseAdmin.__mockTable('vendas', {
        data: [
          { id: 'venda-1', item_indice: 0 },
          { id: 'venda-2', item_indice: 1 },
        ],
        error: null,
      });
      mockSupabaseAdmin.__mockTable('pedidos', { data: null, error: null });

      const pedido = await garantirVendasDoPedido(pedidoBase({
        itens: [{ id: 10, quantidade: 1 }, { id: 11, quantidade: 1 }],
      }));

      expect(pedido.itens.map((item) => item.venda_id)).toEqual(['venda-1', 'venda-2']);
      expect(pedido.itens.map((item) => item.fornecedor_nome)).toEqual(['Loja do Zé', 'Weber Parts']);
    });

    it('persiste os venda_id no pedido quando eles ainda nao estavam salvos', async () => {
      mockarBuscas();
      mockSupabaseAdmin.__mockTable('vendas', { data: [{ id: 'venda-1', item_indice: 0 }], error: null });
      mockSupabaseAdmin.__mockTable('pedidos', { data: null, error: null });

      await garantirVendasDoPedido(pedidoBase());

      const [atualizacao] = mockSupabaseAdmin.__callsFor('pedidos');
      expect(atualizacao.argumentos('update')[0].itens[0]).toMatchObject({
        venda_id: 'venda-1',
        fornecedor_id: 5,
      });
      expect(atualizacao.argumentos('eq')).toEqual(['id', '2026-100200']);
    });

    it('nao regrava o pedido quando os vinculos ja estao corretos', async () => {
      mockarBuscas();
      mockSupabaseAdmin.__mockTable('vendas', { data: [{ id: 'venda-1', item_indice: 0 }], error: null });

      await garantirVendasDoPedido(pedidoBase({
        itens: [{ id: 10, quantidade: 2, fornecedor_id: 5, venda_id: 'venda-1' }],
      }));

      expect(mockSupabaseAdmin.__callsFor('pedidos')).toHaveLength(0);
    });

    it('devolve o pedido sem consultar o banco quando nao ha itens', async () => {
      const pedido = await garantirVendasDoPedido(pedidoBase({ itens: [] }));

      expect(pedido.itens).toEqual([]);
      expect(mockSupabaseAdmin.from).not.toHaveBeenCalled();
    });

    it('rejeita com 409 quando um item nao corresponde a nenhuma peca cadastrada', async () => {
      mockarBuscas({ pecas: [] });

      await expect(garantirVendasDoPedido(pedidoBase())).rejects.toMatchObject({
        statusCode: 409,
        message: expect.stringContaining('vincular um item do pedido'),
      });
    });

    it('rejeita com 409 quando a peca nao tem fornecedor vinculado', async () => {
      mockarBuscas({ pecas: [{ ...PECA_FRISO, fornecedor_id: null }], usuarios: [] });

      await expect(garantirVendasDoPedido(pedidoBase())).rejects.toBeInstanceOf(AppError);
    });

    it.each([
      ['pecas', 'busca das pecas'],
      ['vendas', 'upsert das vendas'],
    ])('propaga o erro do Supabase vindo de %s', async (tabela) => {
      mockarBuscas();
      mockSupabaseAdmin.__mockTable('vendas', { data: [], error: null });
      mockSupabaseAdmin.__mockTable(tabela, { data: null, error: { code: '42P01' } });

      await expect(garantirVendasDoPedido(pedidoBase())).rejects.toMatchObject({ code: '42P01' });
    });

    it('usa onConflict em pedido_id/item_indice para nao duplicar vendas', async () => {
      mockarBuscas();
      mockSupabaseAdmin.__mockTable('vendas', { data: [], error: null });
      mockSupabaseAdmin.__mockTable('pedidos', { data: null, error: null });

      await garantirVendasDoPedido(pedidoBase());

      const [upsert] = mockSupabaseAdmin.__callsFor('vendas');
      expect(upsert.argumentos('upsert')[1]).toEqual({ onConflict: 'pedido_id,item_indice' });
    });
  });

  describe('sincronizarStatusVendas', () => {
    it('replica o status do pedido em todas as vendas vinculadas', async () => {
      mockSupabaseAdmin.__mockTable('vendas', { error: null });

      await sincronizarStatusVendas({ id: '2026-100200', status: 'enviado', historico: [] });

      const [atualizacao] = mockSupabaseAdmin.__callsFor('vendas');
      expect(atualizacao.argumentos('update')[0]).toEqual({ status: 'enviado' });
      expect(atualizacao.argumentos('eq')).toEqual(['pedido_id', '2026-100200']);
    });

    it('preenche data_entrega com a data do historico de entrega', async () => {
      mockSupabaseAdmin.__mockTable('vendas', { error: null });

      await sincronizarStatusVendas({
        id: '2026-100200',
        status: 'entregue',
        historico: [{ status: 'entregue', data: '2026-01-09T18:30:00.000Z' }],
      });

      expect(mockSupabaseAdmin.__callsFor('vendas')[0].argumentos('update')[0]).toEqual({
        status: 'entregue',
        data_entrega: '2026-01-09T18:30:00.000Z',
      });
    });

    it('usa a data atual quando o historico nao registra a entrega', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-03-01T12:00:00.000Z'));
      mockSupabaseAdmin.__mockTable('vendas', { error: null });

      await sincronizarStatusVendas({ id: '2026-100200', status: 'entregue', historico: [] });

      expect(mockSupabaseAdmin.__callsFor('vendas')[0].argumentos('update')[0].data_entrega)
        .toBe('2026-03-01T12:00:00.000Z');

      jest.useRealTimers();
    });

    it('preenche cancelled_at quando o pedido e cancelado', async () => {
      mockSupabaseAdmin.__mockTable('vendas', { error: null });

      await sincronizarStatusVendas({
        id: '2026-100200',
        status: 'cancelado',
        historico: [{ status: 'cancelado', data: '2026-01-06T12:00:00.000Z' }],
      });

      expect(mockSupabaseAdmin.__callsFor('vendas')[0].argumentos('update')[0]).toEqual({
        status: 'cancelado',
        cancelled_at: '2026-01-06T12:00:00.000Z',
      });
    });

    it('propaga erros do Supabase', async () => {
      mockSupabaseAdmin.__mockTable('vendas', { error: { code: '23503' } });

      await expect(
        sincronizarStatusVendas({ id: '2026-100200', status: 'pago', historico: [] }),
      ).rejects.toMatchObject({ code: '23503' });
    });
  });
});
