import { act, renderHook, waitFor } from '@testing-library/react';
import useConversa from '../useConversa';
import useConversasAtivas from '../useConversasAtivas';

const t = (key) => key;
const user = { id: 'auth-1' };

function gateways(overrides = {}) {
  const unsubscribe = jest.fn();
  return {
    unsubscribe,
    mensagensGateway: {
      listarMensagensConversa: jest.fn().mockResolvedValue([{ id: 1, mensagem: 'oi' }]),
      assinarMensagensConversa: jest.fn(() => unsubscribe),
      enviarMensagem: jest.fn().mockResolvedValue({ id: 2, mensagem: 'nova' }),
      listarConversasAtivas: jest.fn().mockResolvedValue([{ outroUsuarioId: 7 }, { outroUsuarioId: 8 }]),
      assinarMensagensUsuario: jest.fn(() => unsubscribe),
      ...overrides.mensagens,
    },
    perfilGateway: {
      buscarPerfil: jest.fn().mockResolvedValue({ profile: { id: 1, full_name: 'Eu' } }),
      buscarUsuario: jest.fn().mockResolvedValue({ profile: { id: 7, full_name: 'Ana Souza' } }),
      ...overrides.perfil,
    },
  };
}

describe('useConversa', () => {
  test('carrega conversa, assina novas mensagens e envia', async () => {
    const g = gateways();
    const { result, unmount } = renderHook(() => useConversa({ id: 7, user, loadingAuth: false, t, ...g }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.mensagens).toHaveLength(1);
    expect(result.current.nomeDestinatario).toBeTruthy();
    const { onNovaMensagem } = g.mensagensGateway.assinarMensagensConversa.mock.calls[0][0];
    act(() => onNovaMensagem({ id: 3, mensagem: 'push' }));
    expect(result.current.mensagens).toHaveLength(2);

    act(() => result.current.setTexto('olá'));
    await act(async () => { await result.current.handleEnviarMensagem({ preventDefault: jest.fn() }); });
    expect(g.mensagensGateway.enviarMensagem).toHaveBeenCalledWith({ idRemetente: 1, idDestinatario: 7, mensagem: 'olá' });
    expect(result.current.texto).toBe('');
    unmount();
    expect(g.unsubscribe).toHaveBeenCalled();
  });

  test('nao carrega sem usuario e trata conversa consigo mesmo', async () => {
    const g = gateways();
    const semUsuario = renderHook(() => useConversa({ id: 7, user: null, loadingAuth: false, t, ...g }));
    await waitFor(() => expect(semUsuario.result.current.loading).toBe(false));
    expect(g.perfilGateway.buscarPerfil).not.toHaveBeenCalled();

    const mesmo = gateways({ perfil: { buscarUsuario: jest.fn().mockResolvedValue({ id: 1 }) } });
    const { result } = renderHook(() => useConversa({ id: 1, user, loadingAuth: false, t, ...mesmo }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.conversaComigoMesmo).toBe(true);
    expect(result.current.mensagens).toEqual([]);
    expect(mesmo.mensagensGateway.assinarMensagensConversa).not.toHaveBeenCalled();
    await act(async () => { await result.current.handleEnviarMensagem({ preventDefault: jest.fn() }); });
    expect(mesmo.mensagensGateway.enviarMensagem).toHaveBeenCalled();
  });

  test('trata respostas invalidas e erros', async () => {
    const g = gateways({ mensagens: { listarMensagensConversa: jest.fn().mockResolvedValue(null), enviarMensagem: jest.fn().mockRejectedValue(new Error('falhou')) } });
    const { result } = renderHook(() => useConversa({ id: 7, user, loadingAuth: false, t, ...g }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.mensagens).toEqual([]);
    await act(async () => { await result.current.handleEnviarMensagem({ preventDefault: jest.fn() }); });
    expect(result.current.errorMessage).toBeTruthy();

    const erro = gateways({ perfil: { buscarPerfil: jest.fn().mockRejectedValue(new Error('x')) } });
    const falha = renderHook(() => useConversa({ id: 7, user, loadingAuth: false, t, ...erro }));
    await waitFor(() => expect(falha.result.current.errorMessage).toBeTruthy());
    await act(async () => { await falha.result.current.handleEnviarMensagem({ preventDefault: jest.fn() }); });
    expect(erro.mensagensGateway.enviarMensagem).not.toHaveBeenCalled();
  });

  test('aceita perfis sem envelope profile', async () => {
    const g = gateways({ perfil: { buscarPerfil: jest.fn().mockResolvedValue({ id: 1 }), buscarUsuario: jest.fn().mockResolvedValue(null) } });
    const { result } = renderHook(() => useConversa({ id: 9, user, loadingAuth: false, t, ...g }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.destinatario).toBeNull();
  });
});

describe('useConversasAtivas', () => {
  test('lista conversas com dados do outro usuario e recarrega ao receber mensagem', async () => {
    const g = gateways({ perfil: { buscarUsuario: jest.fn().mockResolvedValueOnce({ profile: { id: 7 } }).mockRejectedValueOnce(new Error('x')) } });
    const { result, unmount } = renderHook(() => useConversasAtivas({ user, loadingAuth: false, t, ...g }));
    await waitFor(() => expect(result.current.conversas).toHaveLength(2));
    expect(result.current.conversas[0].usuario).toEqual({ id: 7 });
    expect(result.current.conversas[1].usuario).toBeNull();
    expect(result.current.conversasVazias).toBe(false);
    const { onNovaMensagem } = g.mensagensGateway.assinarMensagensUsuario.mock.calls[0][0];
    g.perfilGateway.buscarUsuario.mockResolvedValue({ id: 7 });
    await act(async () => { await onNovaMensagem(); });
    expect(g.mensagensGateway.listarConversasAtivas).toHaveBeenCalledTimes(2);
    unmount();
    expect(g.unsubscribe).toHaveBeenCalled();
  });

  test('nao carrega sem usuario, perfil sem id e erros', async () => {
    const g = gateways();
    const semUsuario = renderHook(() => useConversasAtivas({ user: null, loadingAuth: false, t, ...g }));
    await waitFor(() => expect(semUsuario.result.current.loading).toBe(false));
    expect(g.perfilGateway.buscarPerfil).not.toHaveBeenCalled();

    const semId = gateways({ perfil: { buscarPerfil: jest.fn().mockResolvedValue(null) } });
    const vazio = renderHook(() => useConversasAtivas({ user, loadingAuth: false, t, ...semId }));
    await waitFor(() => expect(vazio.result.current.conversasVazias).toBe(true));

    const erro = gateways({ mensagens: { listarConversasAtivas: jest.fn().mockRejectedValue(new Error('x')) } });
    const falha = renderHook(() => useConversasAtivas({ user, loadingAuth: false, t, ...erro }));
    await waitFor(() => expect(falha.result.current.errorMessage).toBeTruthy());
  });
});
