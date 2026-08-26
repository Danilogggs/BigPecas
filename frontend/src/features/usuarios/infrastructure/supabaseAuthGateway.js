import { AUTH_API_URL } from '../../../services/apiConfig';
import { getSupabaseClient, hasSupabaseConfig } from '../../../services/supabase';
import {
  createFriendlyError,
  parseErrorResponse,
  parseUnexpectedError,
} from '../../../utils/friendlyErrors';
import { normalizarEmailUsuario } from '../domain/usuario';

const obterAuth = () => getSupabaseClient().auth;

const supabaseAuthGateway = Object.freeze({
  estaConfigurado: () => hasSupabaseConfig,

  async obterSessao() {
    const { data, error } = await obterAuth().getSession();
    if (error) throw error;
    return data?.session || null;
  },

  observarSessao(callback) {
    const { data } = obterAuth().onAuthStateChange((_evento, sessao) => callback(sessao || null));
    return () => data?.subscription?.unsubscribe();
  },

  async cadastrar(dados, mensagens) {
    try {
      const response = await fetch(`${AUTH_API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados),
      });
      if (!response.ok) {
        throw createFriendlyError(await parseErrorResponse(response, mensagens.resposta));
      }
      return response.json();
    } catch (error) {
      console.error('Erro ao cadastrar usuário:', error);
      throw createFriendlyError(parseUnexpectedError(error, mensagens.inesperado));
    }
  },

  async entrar(email, password) {
    const { data, error } = await obterAuth().signInWithPassword({
      email: normalizarEmailUsuario(email),
      password,
    });
    if (error) throw error;
    return data;
  },

  async sair() {
    const { error } = await obterAuth().signOut();
    if (error) throw error;
  },

  async solicitarRedefinicao(email, redirectTo) {
    const { data, error } = await obterAuth().resetPasswordForEmail(
      normalizarEmailUsuario(email),
      { redirectTo },
    );
    if (error) throw error;
    return data;
  },

  async atualizarSenha(newPassword) {
    const { data, error } = await obterAuth().updateUser({ password: newPassword });
    if (error) throw error;
    await this.sair();
    return data;
  },

  async obterToken() {
    const sessao = await this.obterSessao();
    return sessao?.access_token || null;
  },
});

export default supabaseAuthGateway;
