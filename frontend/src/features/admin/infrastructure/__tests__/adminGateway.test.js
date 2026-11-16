import adminGateway from '../adminGateway';
import { criarResposta, respostaDeErro } from '../../../../../jest/helpers/http';

const BASE = 'http://localhost:3001/api/admin';
const mensagens = { semPermissao: 'sem permissao', indisponivel: 'indisponivel' };
const jsonInvalido = () => ({ ok: false, json: async () => { throw new Error('x'); } });

beforeEach(() => { global.fetch = jest.fn(); });

describe('adminGateway.carregar', () => {
  test('carrega admin, dashboard e preferencias', async () => {
    fetch
      .mockResolvedValueOnce(criarResposta({ body: { admin: { id: 1 } } }))
      .mockResolvedValueOnce(criarResposta({ body: { usuarios: 2 } }))
      .mockResolvedValueOnce(criarResposta({ body: { config: { widgets: ['a'] } } }));
    await expect(adminGateway.carregar('tk', mensagens)).resolves.toEqual({ admin: { id: 1 }, dashboard: { usuarios: 2 }, widgets: ['a'] });
    expect(fetch.mock.calls[0][1].headers).toEqual({ Authorization: 'Bearer tk' });
  });

  test('aceita preferencias vazias', async () => {
    fetch
      .mockResolvedValueOnce(criarResposta({ body: { admin: {} } }))
      .mockResolvedValueOnce(criarResposta({ body: {} }))
      .mockResolvedValueOnce(criarResposta({ body: null }));
    await expect(adminGateway.carregar('tk', mensagens)).resolves.toMatchObject({ widgets: undefined });
  });

  test('diferencia falta de permissao de indisponibilidade', async () => {
    fetch.mockResolvedValueOnce(respostaDeErro(403, {})).mockResolvedValue(criarResposta());
    await expect(adminGateway.carregar('tk', mensagens)).rejects.toThrow('sem permissao');
    fetch.mockReset();
    fetch.mockResolvedValueOnce(criarResposta()).mockResolvedValueOnce(respostaDeErro(500, {})).mockResolvedValueOnce(criarResposta());
    await expect(adminGateway.carregar('tk', mensagens)).rejects.toThrow('indisponivel');
  });
});

describe('adminGateway escrita', () => {
  test('salva preferencias e propaga erro', async () => {
    fetch.mockResolvedValueOnce(criarResposta({ body: { ok: true } }));
    await expect(adminGateway.salvarPreferencias('tk', ['x'], 'erro')).resolves.toEqual({ ok: true });
    expect(fetch.mock.calls[0][1]).toMatchObject({ method: 'PUT', body: JSON.stringify({ widgets: ['x'] }) });
    fetch.mockResolvedValueOnce(respostaDeErro(500, {}));
    await expect(adminGateway.salvarPreferencias('tk', [], 'erro ao salvar')).rejects.toThrow('erro ao salvar');
  });

  test('cria conta administrativa com mensagens do servidor ou padrao', async () => {
    fetch.mockResolvedValueOnce(criarResposta({ body: { message: 'ok' } }));
    await expect(adminGateway.criarContaAdmin('tk', { email: 'a' })).resolves.toEqual({ message: 'ok' });
    fetch.mockResolvedValueOnce(respostaDeErro(400, { error: 'email duplicado' }));
    await expect(adminGateway.criarContaAdmin('tk', {})).rejects.toThrow('email duplicado');
    fetch.mockResolvedValueOnce(jsonInvalido());
    await expect(adminGateway.criarContaAdmin('tk', {})).rejects.toThrow('Não foi possível criar a conta administrativa.');
  });

  test.each([
    ['listarUsuarios', ['tk'], '/usuarios?search=&limit=100', 'GET'],
    ['listarUsuarios', ['tk', 'ana b'], '/usuarios?search=ana%20b&limit=100', 'GET'],
    ['carregarDadosGerenciais', ['tk'], '/analytics?days=30&granularity=semanal', 'GET'],
    ['atualizarAdmin', ['tk', 3, true], '/usuarios/3/admin', 'PATCH'],
    ['editarUsuario', ['tk', 3, { a: 1 }], '/usuarios/3', 'PATCH'],
    ['removerUsuario', ['tk', 3], '/usuarios/3', 'DELETE'],
    ['removerUsuarioPermanente', ['tk', 3], '/usuarios/3/permanente', 'DELETE'],
    ['listarPecas', ['tk'], '/pecas?search=&limit=100', 'GET'],
    ['editarPeca', ['tk', 4, {}], '/pecas/4', 'PATCH'],
    ['removerPeca', ['tk', 4], '/pecas/4', 'DELETE'],
    ['removerPecaPermanente', ['tk', 4], '/pecas/4/permanente', 'DELETE'],
    ['listarPedidos', ['tk'], '/pedidos?limit=100', 'GET'],
    ['listarPedidos', ['tk', 'pago'], '/pedidos?limit=100&status=pago', 'GET'],
    ['atualizarPedido', ['tk', 'a/b', 'pago'], '/pedidos/a%2Fb/status', 'PATCH'],
    ['listarAvaliacoes', ['tk', 'produtos'], '/avaliacoes/produtos?limit=100', 'GET'],
    ['editarAvaliacao', ['tk', 'produtos', 9, {}], '/avaliacoes/produtos/9', 'PATCH'],
    ['removerAvaliacao', ['tk', 'produtos', 9], '/avaliacoes/produtos/9', 'DELETE'],
  ])('%s chama a rota correta', async (metodo, args, caminho, verbo) => {
    fetch.mockResolvedValueOnce(criarResposta({ body: { ok: 1 } }));
    await expect(adminGateway[metodo](...args)).resolves.toEqual({ ok: 1 });
    expect(fetch.mock.calls[0][0]).toBe(`${BASE}${caminho}`);
    expect(fetch.mock.calls[0][1].method || 'GET').toBe(verbo);
  });

  test('requisicoes genericas usam mensagem do servidor, padrao e tratam JSON invalido', async () => {
    fetch.mockResolvedValueOnce(respostaDeErro(400, { error: 'falhou' }));
    await expect(adminGateway.removerPeca('tk', 1)).rejects.toThrow('falhou');
    fetch.mockResolvedValueOnce(jsonInvalido());
    await expect(adminGateway.removerPeca('tk', 1)).rejects.toThrow('Não foi possível concluir esta ação.');
  });
});

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
