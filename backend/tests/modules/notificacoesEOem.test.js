const request = require('supertest');
const express = require('express');
const { createSupabaseMock } = require('../helpers/supabaseMock');
const criarRepositorio = require('../../src/modules/notificacoes/infrastructure/SupabaseNotificacoesRepository');
const criarUseCases = require('../../src/modules/notificacoes/application/criarNotificacoesUseCases');
const { normalizarOem, validarENormalizarOem } = require('../../src/modules/pecas/domain/oem');

jest.mock('../../src/services/currencyService', () => ({
  config: jest.fn(async () => [{ moeda: 'BRL' }]),
  getPecaPriceRanges: jest.fn(async (id) => ({ id })),
  categories: jest.fn(async (moeda) => ({ moeda })),
  filterByPriceRange: jest.fn(async (...args) => args),
  convert: jest.fn(async (price) => price * 2),
}));
const currencyService = require('../../src/services/currencyService');
const currencyRoutes = require('../../src/routes/currencyRoutes');
const errorHandler = require('../../src/middlewares/errorHandler');

const tabelas = { usuarios: 'users', notificacoes: 'notificacoes' };

describe('repositorio de notificacoes', () => {
  let supabase;
  let repo;
  beforeEach(() => {
    supabase = createSupabaseMock();
    repo = criarRepositorio({ supabase, tabelas });
  });

  test('consultas com sucesso e valores ausentes', async () => {
    supabase.__queueTable('users', { data: { id: 1 }, error: null });
    await expect(repo.buscarUsuario('a@b.com')).resolves.toEqual({ id: 1 });
    supabase.__queueTable('notificacoes', { count: 3, error: null }, { count: null, error: null }, { data: null, error: null }, { data: { id: 9 }, error: null });
    await expect(repo.contarNaoLidas(1)).resolves.toBe(3);
    await expect(repo.contarNaoLidas(1)).resolves.toBe(0);
    await expect(repo.listar(1)).resolves.toEqual([]);
    await expect(repo.marcarComoLida(9, 1)).resolves.toEqual({ id: 9 });
  });

  test('propaga erros do banco', async () => {
    supabase.__mockTable('users', { data: null, error: new Error('u') });
    supabase.__mockTable('notificacoes', { data: null, error: new Error('n') });
    await expect(repo.buscarUsuario('a')).rejects.toThrow('u');
    await expect(repo.contarNaoLidas(1)).rejects.toThrow('n');
    await expect(repo.listar(1)).rejects.toThrow('n');
    await expect(repo.marcarComoLida(1, 1)).rejects.toThrow('n');
  });
});

describe('casos de uso de notificacoes', () => {
  const repository = {
    buscarUsuario: jest.fn(async () => ({ id: 1 })),
    contarNaoLidas: jest.fn(async () => 2),
    listar: jest.fn(async () => [{ id: 1 }]),
    marcarComoLida: jest.fn(async () => ({ id: 1 })),
  };
  const useCases = criarUseCases({ repository });
  const user = { email: 'a@b.com' };

  test('conta, lista e marca como lida', async () => {
    await expect(useCases.contar(user)).resolves.toEqual({ count: 2 });
    await expect(useCases.listar(user)).resolves.toEqual({ notificacoes: [{ id: 1 }] });
    await expect(useCases.marcarComoLida(user, 1)).resolves.toEqual({ notificacao: { id: 1 } });
  });

  test('exige usuario autenticado, existente e notificacao valida', async () => {
    await expect(useCases.contar({})).rejects.toMatchObject({ statusCode: 401 });
    await expect(useCases.contar(null)).rejects.toMatchObject({ statusCode: 401 });
    repository.buscarUsuario.mockResolvedValueOnce(null);
    await expect(useCases.listar(user)).rejects.toMatchObject({ statusCode: 404 });
    repository.marcarComoLida.mockResolvedValueOnce(null);
    await expect(useCases.marcarComoLida(user, 5)).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('dominio OEM', () => {
  test('normaliza e valida numeros OEM', () => {
    expect(normalizarOem()).toBe('');
    expect(normalizarOem('ab-1 2')).toBe('AB12');
    expect(validarENormalizarOem(' 1h0-407/151 ')).toBe('1H0407151');
    expect(() => validarENormalizarOem(123)).toThrow(expect.objectContaining({ statusCode: 400 }));
    expect(() => validarENormalizarOem('a')).toThrow(expect.objectContaining({ statusCode: 400 }));
    expect(() => validarENormalizarOem('- /')).toThrow(expect.objectContaining({ statusCode: 400 }));
  });
});

describe('rotas de moeda', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/moeda', currencyRoutes);
  app.use(errorHandler);

  test('expoe configuracao, faixas e conversao', async () => {
    expect((await request(app).get('/api/moeda/config')).body).toEqual([{ moeda: 'BRL' }]);
    expect((await request(app).get('/api/moeda/peca/7/faixas-preco')).body).toEqual({ id: '7' });
    expect((await request(app).get('/api/moeda/categorias?moeda=USD')).body).toEqual({ moeda: 'USD' });
    expect((await request(app).get('/api/moeda/categorias/populares?moeda=EUR')).body).toEqual({ moeda: 'EUR' });
    expect((await request(app).get('/api/moeda/filtrar-por-faixa?priceMin=1&priceMax=2&moeda=BRL&limit=5&offset=0')).body).toEqual(['1', '2', 'BRL', '5', '0']);
    expect((await request(app).post('/api/moeda/converter').send({ price: 10 })).body).toEqual({ original: { value: 10, currency: 'BRL' }, converted: { value: 20, currency: 'USD' } });
    expect((await request(app).post('/api/moeda/converter').send({ price: 1, fromCurrency: 'USD', toCurrency: 'EUR' })).body.converted.currency).toBe('EUR');
  });

  test('encaminha erros ao middleware', async () => {
    currencyService.config.mockRejectedValueOnce(Object.assign(new Error('indisponivel'), { statusCode: 503 }));
    expect((await request(app).get('/api/moeda/config')).status).toBe(503);
  });
});
