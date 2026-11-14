import { act, renderHook, waitFor } from '@testing-library/react';
import useAdminDashboard from '../useAdminDashboard';
import { WIDGETS_PADRAO } from '../../domain/dashboard';

const t = (key) => key;
const dashboard = { usuarios: 2, administradores: 1, pecas: 5 };

function criarGateway(overrides = {}) {
  return {
    carregar: jest.fn().mockResolvedValue({ admin: { id: 1 }, dashboard, widgets: ['pedidos', 'fluxo_pedidos'] }),
    salvarPreferencias: jest.fn().mockResolvedValue({}),
    ...overrides,
  };
}

const render = (gateway, getToken = jest.fn().mockResolvedValue('tk')) => renderHook(
  () => useAdminDashboard({ getToken, t, gateway }),
);

test('carrega dashboard e widgets salvos', async () => {
  const gateway = criarGateway();
  const { result } = render(gateway);
  await waitFor(() => expect(result.current.state.loading).toBe(false));
  expect(result.current.state).toMatchObject({ admin: { id: 1 }, dashboard });
  expect(result.current.widgets).toEqual(['pedidos', 'fluxo_pedidos']);
  expect(gateway.carregar).toHaveBeenCalledWith('tk', { semPermissao: 'adminPermissionDenied', indisponivel: 'adminUnavailable' });
});

test('exige token e propaga erro de carregamento', async () => {
  const semToken = render(criarGateway(), jest.fn().mockResolvedValue(''));
  await waitFor(() => expect(semToken.result.current.state.error).toBe('sessionRequired'));
  const falha = render(criarGateway({ carregar: jest.fn().mockRejectedValue(new Error('sem acesso')) }));
  await waitFor(() => expect(falha.result.current.state.error).toBe('sem acesso'));
});

test('ignora resposta apos desmontar', async () => {
  let resolver;
  const gateway = criarGateway({ carregar: jest.fn(() => new Promise((r) => { resolver = r; })) });
  const { result, unmount } = render(gateway);
  await waitFor(() => expect(gateway.carregar).toHaveBeenCalled());
  unmount();
  await act(async () => resolver({ admin: {}, dashboard: {}, widgets: [] }));
  expect(result.current.state.loading).toBe(true);
});

test('personaliza, reordena e salva widgets', async () => {
  const gateway = criarGateway();
  const { result } = render(gateway);
  await waitFor(() => expect(result.current.state.loading).toBe(false));

  act(() => result.current.toggleCustomizing());
  expect(result.current.customizing).toBe(true);
  expect(result.current.visibleWidgets).toEqual(result.current.draftWidgets);
  act(() => result.current.toggleWidget('usuarios'));
  expect(result.current.draftWidgets).toContain('usuarios');
  act(() => result.current.moveWidget('usuarios', -1));
  act(() => result.current.reorderWidget('usuarios', 'pedidos'));
  expect(result.current.draftWidgets[0]).toBe('usuarios');
  const antes = result.current.draftWidgets;
  act(() => result.current.reorderWidget('usuarios', 'usuarios'));
  act(() => result.current.reorderWidget('inexistente', 'pedidos'));
  expect(result.current.draftWidgets).toBe(antes);

  await act(async () => { await result.current.savePreferences(); });
  expect(gateway.salvarPreferencias).toHaveBeenCalledWith('tk', antes, 'adminSaveFailed');
  expect(result.current.feedback).toBe('adminSaved');
  expect(result.current.customizing).toBe(false);
  expect(result.current.widgets).toEqual(antes);

  await act(async () => { await result.current.savePreferences(WIDGETS_PADRAO); });
  expect(result.current.widgets).toEqual(WIDGETS_PADRAO);
});

test('informa falha ao salvar preferencias', async () => {
  const gateway = criarGateway({ salvarPreferencias: jest.fn().mockRejectedValue(new Error('falhou')) });
  const { result } = render(gateway);
  await waitFor(() => expect(result.current.state.loading).toBe(false));
  await act(async () => { await result.current.savePreferences(); });
  expect(result.current.feedback).toBe('falhou');
  expect(result.current.saving).toBe(false);
});

test('ajusta contadores do dashboard sem valores negativos', async () => {
  const { result } = render(criarGateway());
  await waitFor(() => expect(result.current.state.loading).toBe(false));
  act(() => result.current.registrarAdminCriado());
  expect(result.current.state.dashboard).toMatchObject({ usuarios: 3, administradores: 2 });
  act(() => result.current.ajustarDashboard({ pecas: -10, usuarios: -1 }));
  expect(result.current.state.dashboard).toMatchObject({ pecas: 0, usuarios: 2 });
});

test('ajustes nao criam dashboard inexistente', async () => {
  const gateway = criarGateway({ carregar: jest.fn().mockResolvedValue({ admin: {}, dashboard: null, widgets: null }) });
  const { result } = render(gateway);
  await waitFor(() => expect(result.current.state.loading).toBe(false));
  act(() => result.current.registrarAdminCriado());
  act(() => result.current.ajustarDashboard({ pecas: 1 }));
  expect(result.current.state.dashboard).toBeNull();
});

test('contadores ausentes partem de zero', async () => {
  const gateway = criarGateway({ carregar: jest.fn().mockResolvedValue({ admin: {}, dashboard: { pecas: null }, widgets: [] }) });
  const { result } = render(gateway);
  await waitFor(() => expect(result.current.state.loading).toBe(false));
  act(() => result.current.registrarAdminCriado());
  act(() => result.current.ajustarDashboard({ pecas: 2 }));
  expect(result.current.state.dashboard).toEqual({ pecas: 2, usuarios: 1, administradores: 1 });
});
