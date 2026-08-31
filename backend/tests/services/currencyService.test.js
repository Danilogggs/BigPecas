const { createSupabaseMock } = require('../helpers/supabaseMock');

const mockSupabaseAdmin = createSupabaseMock();

jest.mock('../../src/config/supabaseClient', () => ({
  supabaseAdmin: mockSupabaseAdmin,
  supabasePublic: null,
}));

const currencyService = require('../../src/services/currencyService');
const AppError = require('../../src/utils/AppError');

/** Quantas unidades da moeda valem 1 real. */
const TAXAS = [
  { moeda: 'BRL', unidades_por_brl: 1 },
  { moeda: 'USD', unidades_por_brl: 0.2 },
  { moeda: 'EUR', unidades_por_brl: 0.18 },
  { moeda: 'JPY', unidades_por_brl: null },
];

function mockarTaxas(data = TAXAS) {
  mockSupabaseAdmin.__mockTable('taxas_cambio', { data, error: null });
}

describe('currencyService', () => {
  beforeEach(() => {
    mockSupabaseAdmin.__reset();
  });

  describe('amount', () => {
    it.each([
      ['numero inteiro', 10, 10],
      ['numero decimal', 10.55, 10.55],
      ['string numerica', '25.5', 25.5],
      ['zero', 0, 0],
    ])('aceita %s', (_descricao, entrada, esperado) => {
      expect(currencyService.amount(entrada)).toBe(esperado);
    });

    it.each([
      ['string vazia', ''],
      ['nulo', null],
      ['indefinido', undefined],
      ['texto', 'abc'],
      ['negativo', -1],
      ['infinito', Infinity],
    ])('recusa %s com 400', (_descricao, entrada) => {
      expect(() => currencyService.amount(entrada)).toThrow(AppError);
      expect(() => currencyService.amount(entrada)).toThrow('Valor monetário inválido.');
    });
  });

  describe('config', () => {
    it('devolve apenas as moedas com taxa configurada', async () => {
      mockarTaxas();

      await expect(currencyService.config()).resolves.toEqual(TAXAS);
      expect(mockSupabaseAdmin.__callsFor('taxas_cambio')[0].argumentos('not')).toEqual([
        'unidades_por_brl',
        'is',
        null,
      ]);
    });

    it('propaga o erro do Supabase', async () => {
      const falha = new Error('sem conexao');
      mockSupabaseAdmin.__mockTable('taxas_cambio', { data: null, error: falha });

      await expect(currencyService.config()).rejects.toBe(falha);
    });
  });

  describe('convert', () => {
    it('converte de real para dolar arredondando em duas casas', async () => {
      mockarTaxas();

      await expect(currencyService.convert(100, 'BRL', 'USD')).resolves.toBe(20);
    });

    it('converte entre duas moedas estrangeiras', async () => {
      mockarTaxas();

      await expect(currencyService.convert(20, 'USD', 'EUR')).resolves.toBe(18);
    });

    it('mantem o valor quando a moeda de origem e destino sao iguais', async () => {
      mockarTaxas();

      await expect(currencyService.convert(350.5, 'BRL', 'BRL')).resolves.toBe(350.5);
    });

    it.each([
      ['a moeda de origem nao existe', 'ARS', 'BRL'],
      ['a moeda de destino nao existe', 'BRL', 'ARS'],
      ['a taxa esta nula', 'BRL', 'JPY'],
    ])('recusa a conversao quando %s', async (_descricao, de, para) => {
      mockarTaxas();

      await expect(currencyService.convert(10, de, para)).rejects.toThrow('Moeda não configurada.');
    });

    it('recusa um valor invalido antes de converter', async () => {
      mockarTaxas();

      await expect(currencyService.convert('abc', 'BRL', 'USD')).rejects.toThrow(
        'Valor monetário inválido.',
      );
    });
  });

  describe('categories', () => {
    it('usa BRL como moeda padrao', async () => {
      mockarTaxas();

      await expect(currencyService.categories()).resolves.toEqual([
        { id: 0, moeda: 'BRL', valor_minimo: 0, valor_maximo: 500 },
        { id: 1, moeda: 'BRL', valor_minimo: 500, valor_maximo: 5000 },
        { id: 2, moeda: 'BRL', valor_minimo: 5000, valor_maximo: null },
      ]);
    });

    it('converte as faixas para a moeda pedida', async () => {
      mockarTaxas();

      await expect(currencyService.categories('USD')).resolves.toEqual([
        { id: 0, moeda: 'USD', valor_minimo: 0, valor_maximo: 100 },
        { id: 1, moeda: 'USD', valor_minimo: 100, valor_maximo: 1000 },
        { id: 2, moeda: 'USD', valor_minimo: 1000, valor_maximo: null },
      ]);
    });

    it('recusa uma moeda sem taxa', async () => {
      mockarTaxas();

      await expect(currencyService.categories('ARS')).rejects.toThrow('Moeda não configurada.');
    });
  });

  describe('getPecaPriceRanges', () => {
    it('devolve os precos publicados da peca', async () => {
      const precos = [{ id: 10, moeda_base: 'BRL', preco_base: 350, moeda_exibicao: 'USD', preco_exibicao: 70 }];
      mockSupabaseAdmin.__mockTable('precos_publicos_moeda', { data: precos, error: null });

      await expect(currencyService.getPecaPriceRanges(10)).resolves.toEqual(precos);
      expect(mockSupabaseAdmin.__callsFor('precos_publicos_moeda')[0].argumentos('eq')).toEqual(['id', 10]);
    });

    it.each([
      ['a peca nao esta publicada', []],
      ['a consulta nao devolve dados', null],
    ])('responde 404 quando %s', async (_descricao, data) => {
      mockSupabaseAdmin.__mockTable('precos_publicos_moeda', { data, error: null });

      await expect(currencyService.getPecaPriceRanges(10)).rejects.toThrow(
        'Peça não publicada ou não encontrada.',
      );
    });

    it('propaga o erro do Supabase', async () => {
      const falha = new Error('view indisponivel');
      mockSupabaseAdmin.__mockTable('precos_publicos_moeda', { data: null, error: falha });

      await expect(currencyService.getPecaPriceRanges(10)).rejects.toBe(falha);
    });
  });

  describe('filterByPriceRange', () => {
    function mockarCatalogo(data = []) {
      mockarTaxas();
      mockSupabaseAdmin.__mockTable('precos_publicos_moeda', { data, error: null });
    }

    /** Consulta feita na view publica de precos. */
    function consulta() {
      return mockSupabaseAdmin.__callsFor('precos_publicos_moeda')[0];
    }

    it('filtra pela moeda e pelo intervalo informado', async () => {
      mockarCatalogo([{ id: 1 }]);

      await expect(currencyService.filterByPriceRange(100, 900, 'USD')).resolves.toEqual([{ id: 1 }]);
      expect(consulta().argumentos('eq')).toEqual(['moeda_exibicao', 'USD']);
      expect(consulta().argumentos('gte')).toEqual(['preco_exibicao', 100]);
      expect(consulta().argumentos('lte')).toEqual(['preco_exibicao', 900]);
    });

    it('usa BRL, minimo zero e pagina de 20 itens como padrao', async () => {
      mockarCatalogo();

      await currencyService.filterByPriceRange();

      expect(consulta().argumentos('eq')).toEqual(['moeda_exibicao', 'BRL']);
      expect(consulta().argumentos('gte')).toEqual(['preco_exibicao', 0]);
      expect(consulta().operacao('lte')).toBeNull();
      expect(consulta().argumentos('range')).toEqual([0, 19]);
    });

    it.each([
      ['maximo nulo', null],
      ['maximo em branco', ''],
    ])('trata %s como faixa aberta', async (_descricao, max) => {
      mockarCatalogo();

      await currencyService.filterByPriceRange(50, max);

      expect(consulta().operacao('lte')).toBeNull();
    });

    it('ordena por preco e desempata pelo id', async () => {
      mockarCatalogo();

      await currencyService.filterByPriceRange();

      expect(consulta().operations.filter((op) => op.method === 'order').map((op) => op.args)).toEqual([
        ['preco_exibicao'],
        ['id'],
      ]);
    });

    it.each([
      ['limit acima do maximo', 500, 0, [0, 99]],
      ['limit invalido', 'abc', 0, [0, 19]],
      ['limit zero', 0, 0, [0, 19]],
      ['limit negativo', -5, 0, [0, 0]],
      ['offset fracionario', 10, 5.9, [5, 14]],
      ['offset negativo', 10, -3, [0, 9]],
    ])('protege a paginacao contra %s', async (_descricao, limit, offset, esperado) => {
      mockarCatalogo();

      await currencyService.filterByPriceRange(0, null, 'BRL', limit, offset);

      expect(consulta().argumentos('range')).toEqual(esperado);
    });

    it('recusa faixa invertida', async () => {
      mockarCatalogo();

      await expect(currencyService.filterByPriceRange(900, 100)).rejects.toThrow(
        'Faixa de preço inválida.',
      );
    });

    it('recusa uma moeda sem taxa antes de consultar o catalogo', async () => {
      mockarCatalogo();

      await expect(currencyService.filterByPriceRange(0, null, 'ARS')).rejects.toThrow(
        'Moeda não configurada.',
      );
      expect(mockSupabaseAdmin.__callsFor('precos_publicos_moeda')).toHaveLength(0);
    });

    it('propaga o erro do Supabase', async () => {
      const falha = new Error('timeout');
      mockarTaxas();
      mockSupabaseAdmin.__mockTable('precos_publicos_moeda', { data: null, error: falha });

      await expect(currencyService.filterByPriceRange()).rejects.toBe(falha);
    });
  });
});
