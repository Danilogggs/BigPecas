const { criarAutoPartsService, montarEndpoint, obterRegistros } = require('../../src/services/autoPartsService');

const env = { AUTOPARTS_API_URL: 'https://catalogo.test/v1/', AUTOPARTS_API_KEY: 'chave' };
const resposta = (status, corpo) => ({ ok: status >= 200 && status < 300, status, text: async () => (typeof corpo === 'string' ? corpo : JSON.stringify(corpo)) });

describe('montarEndpoint', () => {
  test('acrescenta /api quando necessario e parametros de busca', () => {
    expect(montarEndpoint('https://x.test/v1', 4, 'ABC').toString())
      .toBe('https://x.test/v1/api/articles-oem/search-by-article-oem-no?langId=4&articleOemNo=ABC');
    expect(montarEndpoint('https://x.test/api/?a=1', 6, 'Z').toString())
      .toBe('https://x.test/api/articles-oem/search-by-article-oem-no?langId=6&articleOemNo=Z');
  });

  test('rejeita URL invalida', () => {
    expect(() => montarEndpoint('nao e url', 4, 'A')).toThrow(expect.objectContaining({ statusCode: 503 }));
  });
});

describe('obterRegistros', () => {
  test('aceita listas em varios formatos', () => {
    expect(obterRegistros(null)).toEqual([]);
    expect(obterRegistros(undefined)).toEqual([]);
    expect(obterRegistros([1])).toEqual([1]);
    expect(obterRegistros({ results: [2] })).toEqual([2]);
    expect(obterRegistros({ data: null })).toEqual([]);
    expect(() => obterRegistros({ outro: 1 })).toThrow(expect.objectContaining({ statusCode: 502 }));
  });
});

describe('verificarOem', () => {
  test('exige configuracao e fetch disponivel', async () => {
    await expect(criarAutoPartsService({ env: {}, fetchImpl: jest.fn() }).verificarOem('A')).rejects.toMatchObject({ statusCode: 503 });
    await expect(criarAutoPartsService({ env, fetchImpl: null }).verificarOem('A')).rejects.toMatchObject({ statusCode: 503 });
  });

  test('mapeia correspondencias encontradas', async () => {
    const fetchImpl = jest.fn(async () => resposta(200, { data: [
      { articleId: 1, articleNo: 'A1', productName: 'Farol', manufacturer: 'Bosch', image: 'i.png', extra: 'x' },
      { id: 2, oemNo: '', name: 'Roda', brand: null },
      null, [], 'texto',
    ] }));
    const resultado = await criarAutoPartsService({ env: { ...env, AUTOPARTS_LANG_ID: '6' }, fetchImpl }).verificarOem('A1');
    expect(resultado).toEqual({ oem: 'A1', found: true, count: 5, matches: [
      { articleId: 1, searchedOem: 'A1', articleNumber: 'A1', productName: 'Farol', manufacturer: 'Bosch', image: 'i.png' },
      { articleId: 2, searchedOem: 'A1', productName: 'Roda' },
    ] });
    expect(fetchImpl.mock.calls[0][0].searchParams.get('langId')).toBe('6');
    expect(fetchImpl.mock.calls[0][1].headers).toEqual({ 'x-apiprofile-key': 'chave' });
  });

  test('informa nada encontrado', async () => {
    const servico = criarAutoPartsService({ env, fetchImpl: async () => resposta(200, []) });
    await expect(servico.verificarOem('B')).resolves.toEqual({ oem: 'B', found: false, count: 0, matches: [] });
  });

  test.each([
    [401, 502], [403, 502], [500, 502],
  ])('status HTTP %i vira erro %i', async (status, esperado) => {
    const servico = criarAutoPartsService({ env, fetchImpl: async () => resposta(status, {}) });
    await expect(servico.verificarOem('A')).rejects.toMatchObject({ statusCode: esperado });
  });

  test('trata JSON invalido, timeout e falha de rede', async () => {
    await expect(criarAutoPartsService({ env, fetchImpl: async () => resposta(200, '{x') }).verificarOem('A')).rejects.toMatchObject({ statusCode: 502 });
    const abort = Object.assign(new Error('abort'), { name: 'AbortError' });
    await expect(criarAutoPartsService({ env, fetchImpl: async () => { throw abort; } }).verificarOem('A')).rejects.toMatchObject({ statusCode: 504 });
    await expect(criarAutoPartsService({ env, fetchImpl: async () => { throw new Error('rede'); } }).verificarOem('A')).rejects.toMatchObject({ statusCode: 502 });
    await expect(criarAutoPartsService({ env, fetchImpl: async () => { throw null; } }).verificarOem('A')).rejects.toMatchObject({ statusCode: 502 });
  });

  test('aborta requisicoes demoradas', async () => {
    jest.useFakeTimers();
    const fetchImpl = jest.fn((url, { signal }) => new Promise((_, reject) => {
      signal.addEventListener('abort', () => reject(Object.assign(new Error('abort'), { name: 'AbortError' })));
    }));
    const promessa = criarAutoPartsService({ env, fetchImpl }).verificarOem('A');
    jest.advanceTimersByTime(10000);
    await expect(promessa).rejects.toMatchObject({ statusCode: 504 });
    jest.useRealTimers();
  });
});
