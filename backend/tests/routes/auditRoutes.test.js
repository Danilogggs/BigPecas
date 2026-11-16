const request = require('supertest');
const { createSupabaseMock } = require('../helpers/supabaseMock');

const mockSupabaseAdmin = createSupabaseMock();
const mockWorkbook = jest.fn(async () => Buffer.from('xlsx'));

jest.mock('../../src/config/supabaseClient', () => ({ supabaseAdmin: mockSupabaseAdmin, supabasePublic: null }));
jest.mock('../../src/services/auditWorkbook', () => (...args) => mockWorkbook(...args));

const auditRoutes = require('../../src/routes/auditRoutes');
const auditEventRoutes = require('../../src/routes/auditEventRoutes');
const auditService = require('../../src/services/auditService');
const { buildTestApp } = require('../helpers/testApp');

const ADMIN = { id: 7 };
const app = buildTestApp(auditRoutes, { user: { email: 'admin@x.com' }, admin: ADMIN, basePath: '/api/admin/auditoria' });
const eventsApp = buildTestApp(auditEventRoutes, { user: { id: 'auth-1', email: 'Ana@X.com', user_metadata: { full_name: 'Ana Meta' } }, basePath: '/api/auditoria' });

const F = auditService.FUNCTIONALITIES_TABLE;
const L = auditService.LOGS_TABLE;

beforeEach(() => mockSupabaseAdmin.__reset());

describe('auditRoutes', () => {
  test('lista funcionalidades', async () => {
    mockSupabaseAdmin.__queueTable(F, { data: [{ key: 'home' }], error: null }, { data: null, error: null }, { data: null, error: new Error('db') });
    expect((await request(app).get('/api/admin/auditoria/funcionalidades')).body).toEqual({ data: [{ key: 'home' }] });
    expect((await request(app).get('/api/admin/auditoria/funcionalidades')).body).toEqual({ data: [] });
    expect((await request(app).get('/api/admin/auditoria/funcionalidades')).status).toBe(500);
  });

  test('salva configuracao validando payload', async () => {
    expect((await request(app).put('/api/admin/auditoria/funcionalidades').send({})).status).toBe(400);
    expect((await request(app).put('/api/admin/auditoria/funcionalidades').send({ functionalities: [{ key: 'a' }] })).status).toBe(400);
    mockSupabaseAdmin.__queueTable(F, { data: [{ key: 'home', enabled: true }], error: null }, { data: null, error: null }, { data: null, error: new Error('db') });
    const ok = await request(app).put('/api/admin/auditoria/funcionalidades').send({ functionalities: [{ key: 'home', label: ' Início ', enabled: 1 }] });
    expect(ok.body.data).toEqual([{ key: 'home', enabled: true }]);
    const upsert = mockSupabaseAdmin.__callsFor(F)[0].argumentos('upsert')[0][0];
    expect(upsert).toMatchObject({ key: 'home', label: 'Início', enabled: true, updated_by: 7 });
    expect((await request(app).put('/api/admin/auditoria/funcionalidades').send({ functionalities: [{ key: 'home', label: 'x' }] })).body.data).toEqual([]);
    expect((await request(app).put('/api/admin/auditoria/funcionalidades').send({ functionalities: [{ key: 'home', label: 'x' }] })).status).toBe(500);
  });

  test('lista logs por periodo valido', async () => {
    expect((await request(app).get('/api/admin/auditoria/logs?days=15')).status).toBe(400);
    mockSupabaseAdmin.__queueTable(L, { data: [{ id: 1 }], error: null }, { data: null, error: null }, { data: null, error: new Error('db') });
    expect((await request(app).get('/api/admin/auditoria/logs')).body).toEqual({ data: [{ id: 1 }], days: 7 });
    expect((await request(app).get('/api/admin/auditoria/logs?days=30')).body).toEqual({ data: [], days: 30 });
    expect((await request(app).get('/api/admin/auditoria/logs?days=90')).status).toBe(500);
  });

  test('exporta planilha total ou por tela', async () => {
    mockSupabaseAdmin.__mockTable(L, { data: [{ id: 1 }], error: null });
    const total = await request(app).get('/api/admin/auditoria/exportar?days=30');
    expect(total.status).toBe(200);
    expect(total.headers['content-disposition']).toContain('auditoria-total-30-dias.xlsx');
    expect(mockWorkbook).toHaveBeenCalledWith([{ id: 1 }]);

    mockSupabaseAdmin.__queueTable(F, { data: { key: 'home', label: 'Início' }, error: null });
    const tela = await request(app).get('/api/admin/auditoria/exportar?days=7&functionality=home');
    expect(tela.headers['content-disposition']).toContain('auditoria-home-7-dias.xlsx');
    expect(mockSupabaseAdmin.__callsFor(L).at(-1).argumentos('eq')).toEqual(['functionality_key', 'home']);

    mockSupabaseAdmin.__queueTable(F, { data: null, error: null }, { data: null, error: new Error('db') });
    expect((await request(app).get('/api/admin/auditoria/exportar?functionality=xx')).status).toBe(400);
    expect((await request(app).get('/api/admin/auditoria/exportar?functionality=xx')).status).toBe(500);
  });
});

describe('auditEventRoutes e auditService.record', () => {
  test('rejeita eventos incompletos', async () => {
    expect((await request(eventsApp).post('/api/auditoria/eventos').send({ functionality: 'home' })).status).toBe(400);
  });

  test('registra navegacao quando a funcionalidade esta ativa', async () => {
    mockSupabaseAdmin.__mockTable(F, { data: { enabled: true }, error: null });
    mockSupabaseAdmin.__mockTable('users', { data: { id: 3, email: 'ana@x.com', full_name: 'Ana' }, error: null });
    mockSupabaseAdmin.__mockTable(L, { error: null });
    const resposta = await request(eventsApp).post('/api/auditoria/eventos').send({ functionality: 'home', action: 'Acessou /', page_path: '/', from_path: '/login' });
    expect(resposta.status).toBe(201);
    expect(resposta.body).toEqual({ recorded: true });
    const insert = mockSupabaseAdmin.__callsFor(L)[0].argumentos('insert')[0];
    expect(insert).toMatchObject({ functionality_key: 'home', actor_user_id: 3, actor_name: 'Ana', page_path: '/', metadata: { from_path: '/login' } });
  });

  test('nao registra quando desativada e propaga erros', async () => {
    mockSupabaseAdmin.__queueTable(F, { data: null, error: null });
    expect((await request(eventsApp).post('/api/auditoria/eventos').send({ functionality: 'home', action: 'x' })).body).toEqual({ recorded: false });
    mockSupabaseAdmin.__queueTable(F, { data: null, error: new Error('db') });
    expect((await request(eventsApp).post('/api/auditoria/eventos').send({ functionality: 'home', action: 'x' })).status).toBe(500);
  });

  test('getActor cobre usuario sem email, sem perfil e insercao com erro', async () => {
    await expect(auditService.getActor(null)).resolves.toEqual({ actor_auth_id: null });
    await expect(auditService.getActor({ id: 'a' })).resolves.toEqual({ actor_auth_id: 'a' });
    mockSupabaseAdmin.__mockTable('users', { data: null, error: null });
    await expect(auditService.getActor({ email: 'x@y.com', user_metadata: { full_name: 'Meta' } })).resolves.toEqual({ actor_auth_id: null, actor_user_id: null, actor_email: 'x@y.com', actor_name: 'Meta' });
    await expect(auditService.getActor({ email: 'x@y.com' })).resolves.toMatchObject({ actor_name: null });

    mockSupabaseAdmin.__mockTable(F, { data: { enabled: true }, error: null });
    mockSupabaseAdmin.__mockTable(L, { error: new Error('insert') });
    await expect(auditService.record({ functionality_key: 'home', action: 'x'.repeat(400), success: false })).rejects.toThrow('insert');
    const insert = mockSupabaseAdmin.__callsFor(L)[0].argumentos('insert')[0];
    expect(insert.action).toHaveLength(300);
    expect(insert).toMatchObject({ success: false, page_path: null, http_method: null, metadata: {} });
  });

  test('mapeia caminhos da API para funcionalidades', () => {
    expect(auditService.functionalityFromPath('/api/pecas/1')).toBe('cadastro_peca');
    expect(auditService.functionalityFromPath('/api/admin/auditoria/logs')).toBe('auditoria');
    expect(auditService.functionalityFromPath('/api/admin/usuarios')).toBe('admin');
    expect(auditService.functionalityFromPath('/api/qualquer')).toBe('catalogo');
    expect(auditService.functionalityFromPath()).toBe('catalogo');
  });
});
