import { act, renderHook, waitFor } from '@testing-library/react';
import useNotificacoes from '../useNotificacoes';

const lista = [{ id: 1, lida: false }, { id: 2, lida: false }];

test('carrega e marca notificacao como lida', async () => {
  const gateway = {
    listarNotificacoes: jest.fn().mockResolvedValue(lista),
    marcarNotificacaoComoLida: jest.fn().mockResolvedValue({ notificacao: { lida_em: '2026-01-01' } }),
  };
  const { result } = renderHook(() => useNotificacoes({ gateway }));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.notificacoes).toHaveLength(2);
  await act(async () => { await result.current.marcarComoLida(1); });
  expect(gateway.marcarNotificacaoComoLida).toHaveBeenCalledWith(1);
  expect(result.current.notificacoes.find((n) => n.id === 1).lida_em).toBe('2026-01-01');
});

test('expõe erros de carregamento e de atualizacao', async () => {
  const gateway = {
    listarNotificacoes: jest.fn().mockRejectedValue(new Error('offline')),
    marcarNotificacaoComoLida: jest.fn().mockRejectedValue({}),
  };
  const { result } = renderHook(() => useNotificacoes({ gateway }));
  await waitFor(() => expect(result.current.error).toBe('offline'));
  await act(async () => { await result.current.marcarComoLida(1); });
  expect(result.current.error).toBe('Não foi possível atualizar a notificação.');
});

test('usa mensagens padrao e ignora resposta apos desmontar', async () => {
  const semMensagem = { listarNotificacoes: jest.fn().mockRejectedValue(null), marcarNotificacaoComoLida: jest.fn() };
  const { result } = renderHook(() => useNotificacoes({ gateway: semMensagem }));
  await waitFor(() => expect(result.current.error).toBe('Não foi possível carregar suas notificações.'));

  let resolver;
  const lento = { listarNotificacoes: jest.fn(() => new Promise((r) => { resolver = r; })), marcarNotificacaoComoLida: jest.fn() };
  const montado = renderHook(() => useNotificacoes({ gateway: lento }));
  montado.unmount();
  await act(async () => resolver(lista));
  expect(montado.result.current.notificacoes).toEqual([]);
});
