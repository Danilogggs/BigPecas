const { createSupabaseMock } = require('../helpers/supabaseMock');
const mockDb = createSupabaseMock();
jest.mock('../../src/config/supabaseClient', () => ({ supabaseAdmin: mockDb }));
const service = require('../../src/services/currencyService');
const rates = [{ moeda: 'BRL', unidades_por_brl: 1 }, { moeda: 'USD', unidades_por_brl: 0.2 }];
beforeEach(() => {
  mockDb.__reset();
  mockDb.__mockTable('taxas_cambio', { data: rates, error: null });
  mockDb.__mockTable('precos_publicos_moeda', { data: [{ id: 1, preco_exibicao: 20 }], error: null });
});
it.each(['', null, undefined, -1, 'abc', Infinity])('recusa valor monetario %p', value => {
  expect(() => service.amount(value)).toThrow('Valor monetário inválido.');
});
it('converte moedas com arredondamento e preserva zero', async () => {
  expect(service.amount('12.5')).toBe(12.5);
  await expect(service.convert(10, 'USD', 'BRL')).resolves.toBe(50);
  await expect(service.convert(0, 'BRL', 'USD')).resolves.toBe(0);
  await expect(service.convert(12.34, 'BRL', 'USD')).resolves.toBe(2.47);
});
it('recusa moeda ausente e taxa zero', async () => {
  await expect(service.convert(10, 'XXX', 'BRL')).rejects.toThrow('Moeda não configurada.');
  mockDb.__mockTable('taxas_cambio', { data: [{ moeda: 'BRL', unidades_por_brl: 0 }], error: null });
  await expect(service.convert(10, 'BRL', 'BRL')).rejects.toThrow();
});
it('gera faixas em BRL e moeda selecionada com ultima faixa aberta', async () => {
  await expect(service.categories()).resolves.toEqual([
    { id: 0, moeda: 'BRL', valor_minimo: 0, valor_maximo: 500 },
    { id: 1, moeda: 'BRL', valor_minimo: 500, valor_maximo: 5000 },
    { id: 2, moeda: 'BRL', valor_minimo: 5000, valor_maximo: null },
  ]);
  expect((await service.categories('USD'))[0].valor_maximo).toBe(100);
});
it('consulta precos publicados e nao expoe uma peca ausente', async () => {
  await expect(service.getPecaPriceRanges(1)).resolves.toEqual([{ id: 1, preco_exibicao: 20 }]);
  expect(mockDb.__callsFor('precos_publicos_moeda')[0].argumentos('eq')).toEqual(['id', 1]);
  mockDb.__mockTable('precos_publicos_moeda', { data: [], error: null });
  await expect(service.getPecaPriceRanges(2)).rejects.toMatchObject({ statusCode: 404 });
});
it.each([[undefined, undefined], [0, ''], [10, 30]])('filtra faixa %p a %p e pagina', async (min, max) => {
  await expect(service.filterByPriceRange(min, max)).resolves.toHaveLength(1);
  const q = mockDb.__callsFor('precos_publicos_moeda')[0];
  expect(q.argumentos('gte')).toEqual(['preco_exibicao', min ?? 0]);
  expect(q.argumentos('range')).toEqual([0, 19]);
  expect(q.argumentos('lte')).toEqual(max ? ['preco_exibicao', max] : null);
});
it('limita paginacao e recusa faixa invertida', async () => {
  await service.filterByPriceRange(0, 20, 'USD', 500, -5);
  expect(mockDb.__callsFor('precos_publicos_moeda')[0].argumentos('range')).toEqual([0, 99]);
  await expect(service.filterByPriceRange(30, 10)).rejects.toThrow('Faixa de preço inválida.');
});
it('propaga falhas de acesso ao banco', async () => {
  const error = new Error('Banco indisponivel');
  mockDb.__mockTable('taxas_cambio', { error });
  await expect(service.config()).rejects.toBe(error);
  mockDb.__mockTable('taxas_cambio', { data: rates });
  mockDb.__mockTable('precos_publicos_moeda', { error });
  await expect(service.getPecaPriceRanges(1)).rejects.toBe(error);
  await expect(service.filterByPriceRange(0, 20)).rejects.toBe(error);
});
