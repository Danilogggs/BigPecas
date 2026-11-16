import adminGateway from '../adminGateway';

afterEach(() => { jest.restoreAllMocks(); });

test('envia filtros codificados para a API, sem carregar todas as linhas no navegador', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ metricas: { pedidos: 2 } }) });
  const result = await adminGateway.carregarDadosGerenciais('token-teste', {
    days: 90, status: 'pago', fornecedor_id: '5', granularity: 'mensal',
  });
  const [url, options] = fetch.mock.calls[0];
  const params = new URL(url).searchParams;
  expect(Object.fromEntries(params)).toEqual({days:'90',granularity:'mensal',status:'pago',fornecedor_id:'5'});
  expect(options.headers.Authorization).toBe('Bearer token-teste');
  expect(result.metricas.pedidos).toBe(2);
});
