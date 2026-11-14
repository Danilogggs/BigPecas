import { act, renderHook, waitFor } from '@testing-library/react';
import useListaFavoritos from '../useListaFavoritos';

const t = (key) => key;
const evento = () => ({ stopPropagation: jest.fn() });

test('carrega, remove e limpa mensagem de sucesso', async () => {
  jest.useFakeTimers();
  const gateway = {
    listarWish: jest.fn().mockResolvedValue({ pecas: [{ id: 1 }, { id: 2 }] }),
    removerPecaWish: jest.fn().mockResolvedValue({}),
  };
  const { result } = renderHook(() => useListaFavoritos({ t, gateway }));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.pecas).toHaveLength(2);
  const e = evento();
  await act(async () => { await result.current.handleRemover(e, 1); });
  expect(e.stopPropagation).toHaveBeenCalled();
  expect(result.current.pecas).toEqual([{ id: 2 }]);
  expect(result.current.successMessage).toBeTruthy();
  act(() => { jest.advanceTimersByTime(3000); });
  expect(result.current.successMessage).toBe('');
  jest.useRealTimers();
});

test('trata falhas e ignora remocao sem id', async () => {
  const gateway = {
    listarWish: jest.fn().mockRejectedValue(new Error('offline')),
    removerPecaWish: jest.fn().mockRejectedValue(new Error('nao removeu')),
  };
  const { result } = renderHook(() => useListaFavoritos({ t, gateway }));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.errorMessage).toBeTruthy();
  expect(result.current.wishVazia).toBe(false);
  await act(async () => { await result.current.handleRemover(evento(), null); });
  expect(gateway.removerPecaWish).not.toHaveBeenCalled();
  await act(async () => { await result.current.handleRemover(evento(), 3); });
  expect(result.current.errorMessage).toBeTruthy();
});

test('indica lista vazia', async () => {
  const gateway = { listarWish: jest.fn().mockResolvedValue({}), removerPecaWish: jest.fn() };
  const { result } = renderHook(() => useListaFavoritos({ t, gateway }));
  await waitFor(() => expect(result.current.wishVazia).toBe(true));
});
