import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import { getSupabaseClient, hasSupabaseConfig } from '../../services/supabase';
import { criarResposta, respostaDeErro } from '../../../jest/helpers/http';

// `hasSupabaseConfig` e lido dentro do efeito, entao um getter permite simular a
// falta de configuracao sem recarregar o modulo (o que traria um segundo React).
let mockTemConfigSupabase = true;

jest.mock('../../services/supabase', () => ({
  getSupabaseClient: jest.fn(),
  get hasSupabaseConfig() {
    return mockTemConfigSupabase;
  },
}));

const USUARIO = { id: 'uuid-1', email: 'cliente@bigpecas.com' };
const SESSAO = { access_token: 'token-de-teste', user: USUARIO };

let unsubscribe;

function mockarSupabase(overrides = {}) {
  unsubscribe = jest.fn();

  const auth = {
    getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe } } })),
    signInWithPassword: jest.fn(),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    resetPasswordForEmail: jest.fn(),
    updateUser: jest.fn(),
    ...overrides,
  };

  getSupabaseClient.mockReturnValue({ auth });

  return auth;
}

async function montarAuth() {
  const utils = renderHook(() => useAuth(), { wrapper: AuthProvider });
  await waitFor(() => expect(utils.result.current.loading).toBe(false));
  return utils;
}

describe('AuthContext', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    mockTemConfigSupabase = true;
  });

  describe('inicializacao', () => {
    it('recupera a sessao existente do Supabase', async () => {
      mockarSupabase({
        getSession: jest.fn().mockResolvedValue({ data: { session: SESSAO }, error: null }),
      });

      const { result } = await montarAuth();

      expect(result.current.user).toEqual(USUARIO);
      expect(result.current.session).toEqual(SESSAO);
    });

    it('fica deslogado quando nao ha sessao', async () => {
      mockarSupabase();

      const { result } = await montarAuth();

      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
    });

    it('nao trava o carregamento quando o Supabase falha', async () => {
      mockarSupabase({
        getSession: jest.fn().mockResolvedValue({ data: null, error: { message: 'bad jwt' } }),
      });

      const { result } = await montarAuth();

      expect(result.current.user).toBeNull();
    });

    it('reage ao login feito em outra aba', async () => {
      const auth = mockarSupabase();
      const { result } = await montarAuth();

      const [callback] = auth.onAuthStateChange.mock.calls[0];
      act(() => { callback('SIGNED_IN', SESSAO); });

      expect(result.current.user).toEqual(USUARIO);
    });

    it('reage ao logout feito em outra aba', async () => {
      const auth = mockarSupabase({
        getSession: jest.fn().mockResolvedValue({ data: { session: SESSAO }, error: null }),
      });
      const { result } = await montarAuth();

      const [callback] = auth.onAuthStateChange.mock.calls[0];
      act(() => { callback('SIGNED_OUT', null); });

      expect(result.current.user).toBeNull();
    });

    it('cancela a inscricao ao desmontar', async () => {
      mockarSupabase();
      const { unmount } = await montarAuth();

      unmount();

      expect(unsubscribe).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('normaliza o email e guarda a sessao', async () => {
      const auth = mockarSupabase({
        signInWithPassword: jest.fn().mockResolvedValue({
          data: { session: SESSAO, user: USUARIO },
          error: null,
        }),
      });
      const { result } = await montarAuth();

      await act(async () => {
        await result.current.login('  Cliente@BigPecas.com ', 'senha-secreta');
      });

      expect(auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'cliente@bigpecas.com',
        password: 'senha-secreta',
      });
      expect(result.current.user).toEqual(USUARIO);
    });

    it('propaga o erro do Supabase sem alterar o estado', async () => {
      const erro = { code: 'invalid_credentials', message: 'Invalid login credentials' };
      mockarSupabase({
        signInWithPassword: jest.fn().mockResolvedValue({ data: null, error: erro }),
      });
      const { result } = await montarAuth();

      await expect(result.current.login('cliente@bigpecas.com', 'errada')).rejects.toBe(erro);
      expect(result.current.user).toBeNull();
    });
  });

  describe('logout', () => {
    it('limpa usuario e sessao', async () => {
      const auth = mockarSupabase({
        getSession: jest.fn().mockResolvedValue({ data: { session: SESSAO }, error: null }),
      });
      const { result } = await montarAuth();

      await act(async () => { await result.current.logout(); });

      expect(auth.signOut).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
    });

    it('mantem a sessao quando o Supabase recusa o logout', async () => {
      const erro = { message: 'network error' };
      mockarSupabase({
        getSession: jest.fn().mockResolvedValue({ data: { session: SESSAO }, error: null }),
        signOut: jest.fn().mockResolvedValue({ error: erro }),
      });
      const { result } = await montarAuth();

      await expect(result.current.logout()).rejects.toBe(erro);
      expect(result.current.user).toEqual(USUARIO);
    });
  });

  describe('register', () => {
    const dados = { full_name: 'Maria', email: 'maria@bigpecas.com', password: '12345678' };

    it('chama o backend e devolve o corpo da resposta', async () => {
      mockarSupabase();
      global.fetch.mockResolvedValue(criarResposta({ body: { profile: { id: 42 } } }));
      const { result } = await montarAuth();

      await expect(result.current.register(dados)).resolves.toEqual({ profile: { id: 42 } });

      const [url, opcoes] = global.fetch.mock.calls[0];
      expect(url).toBe('http://localhost:3001/api/auth/register');
      expect(opcoes.method).toBe('POST');
      expect(JSON.parse(opcoes.body)).toEqual(dados);
    });

    it('propaga o email ja cadastrado com mensagem amigavel', async () => {
      mockarSupabase();
      global.fetch.mockResolvedValue(
        respostaDeErro(409, { error: 'Este email já está cadastrado.' }),
      );
      const { result } = await montarAuth();

      await expect(result.current.register(dados)).rejects.toThrow('Este email já está cadastrado.');
    });

    it('converte falha de rede em mensagem de conexao', async () => {
      mockarSupabase();
      global.fetch.mockRejectedValue(new TypeError('Failed to fetch'));
      const { result } = await montarAuth();

      await expect(result.current.register(dados)).rejects.toThrow(
        'Não foi possível se conectar ao servidor. Tente novamente em instantes.',
      );
    });
  });

  describe('resetPassword', () => {
    it('envia o email normalizado com a url de retorno', async () => {
      const auth = mockarSupabase({
        resetPasswordForEmail: jest.fn().mockResolvedValue({ data: {}, error: null }),
      });
      const { result } = await montarAuth();

      await act(async () => { await result.current.resetPassword('  Cliente@BigPecas.com '); });

      expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('cliente@bigpecas.com', {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });
    });

    it('propaga o erro do Supabase', async () => {
      const erro = { code: 'over_email_send_rate_limit' };
      mockarSupabase({
        resetPasswordForEmail: jest.fn().mockResolvedValue({ data: null, error: erro }),
      });
      const { result } = await montarAuth();

      await expect(result.current.resetPassword('cliente@bigpecas.com')).rejects.toBe(erro);
    });
  });

  describe('updatePassword', () => {
    it('troca a senha e encerra a sessao por seguranca', async () => {
      const auth = mockarSupabase({
        getSession: jest.fn().mockResolvedValue({ data: { session: SESSAO }, error: null }),
        updateUser: jest.fn().mockResolvedValue({ data: { user: USUARIO }, error: null }),
      });
      const { result } = await montarAuth();

      await act(async () => { await result.current.updatePassword('nova-senha-forte'); });

      expect(auth.updateUser).toHaveBeenCalledWith({ password: 'nova-senha-forte' });
      expect(auth.signOut).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
    });

    it('nao desloga quando a troca falha', async () => {
      const erro = { code: 'same_password' };
      const auth = mockarSupabase({
        getSession: jest.fn().mockResolvedValue({ data: { session: SESSAO }, error: null }),
        updateUser: jest.fn().mockResolvedValue({ data: null, error: erro }),
      });
      const { result } = await montarAuth();

      await expect(result.current.updatePassword('mesma-senha')).rejects.toBe(erro);
      expect(auth.signOut).not.toHaveBeenCalled();
      expect(result.current.user).toEqual(USUARIO);
    });
  });

  describe('getToken', () => {
    it('devolve o token da sessao em memoria sem consultar o Supabase', async () => {
      const auth = mockarSupabase({
        getSession: jest.fn().mockResolvedValue({ data: { session: SESSAO }, error: null }),
      });
      const { result } = await montarAuth();
      auth.getSession.mockClear();

      await expect(result.current.getToken()).resolves.toBe('token-de-teste');
      expect(auth.getSession).not.toHaveBeenCalled();
    });

    it('consulta o Supabase quando nao ha sessao em memoria', async () => {
      const auth = mockarSupabase();
      const { result } = await montarAuth();
      auth.getSession.mockResolvedValue({ data: { session: SESSAO }, error: null });

      await expect(result.current.getToken()).resolves.toBe('token-de-teste');
      expect(auth.getSession).toHaveBeenCalled();
    });

    it('devolve null quando nao existe sessao alguma', async () => {
      mockarSupabase();
      const { result } = await montarAuth();

      await expect(result.current.getToken()).resolves.toBeNull();
    });

    it('propaga o erro do Supabase', async () => {
      const erro = { message: 'session not found' };
      const auth = mockarSupabase();
      const { result } = await montarAuth();
      auth.getSession.mockResolvedValue({ data: null, error: erro });

      await expect(result.current.getToken()).rejects.toBe(erro);
    });
  });

  describe('useAuth', () => {
    it('exige o AuthProvider', () => {
      expect(() => renderHook(() => useAuth())).toThrow(
        'useAuth deve ser usado dentro de AuthProvider',
      );
    });
  });

  describe('quando o Supabase nao esta configurado', () => {
    it('encerra o carregamento sem tentar autenticar', async () => {
      mockTemConfigSupabase = false;
      mockarSupabase();

      const { result } = await montarAuth();

      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
      expect(getSupabaseClient).not.toHaveBeenCalled();
    });

    it('nao registra listener de mudanca de sessao', async () => {
      mockTemConfigSupabase = false;
      const auth = mockarSupabase();

      await montarAuth();

      expect(auth.onAuthStateChange).not.toHaveBeenCalled();
    });
  });

  it('expoe hasSupabaseConfig ligado no cenario padrao dos testes', () => {
    expect(hasSupabaseConfig).toBe(true);
  });
});
