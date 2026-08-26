import {
  createFriendlyError,
  parseErrorResponse,
  parseUnexpectedError,
} from '../../../utils/friendlyErrors';
import { getSupabaseClient } from '../../../services/supabase';
import { AUTH_API_URL } from '../../../services/apiConfig';

async function obterTokenObrigatorio() {
  const { data, error } = await getSupabaseClient().auth.getSession();
  if (error) throw createFriendlyError('Você precisa entrar novamente para continuar.');
  const token = data?.session?.access_token;
  if (!token) throw createFriendlyError('Você precisa estar autenticado para continuar.');
  return token;
}

async function requisitarPerfil(caminho, opcoes, mensagemPadrao) {
  const token = await obterTokenObrigatorio();
  const response = await fetch(`${AUTH_API_URL}/api/auth${caminho}`, {
    ...opcoes,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...opcoes?.headers,
    },
  });
  if (!response.ok) {
    throw createFriendlyError(await parseErrorResponse(response, mensagemPadrao));
  }
  return response.json();
}

export async function salvarPerfil(dados) {
  try {
    const data = await requisitarPerfil('/profile', {
      method: 'POST', body: JSON.stringify(dados),
    }, 'Não foi possível salvar os dados do seu perfil agora. Revise as informações e tente novamente.');
    return data?.profile || data;
  } catch (error) {
    console.error('Erro ao salvar perfil do usuário:', error);
    throw createFriendlyError(parseUnexpectedError(
      error,
      'Não foi possível salvar os dados do seu perfil agora. Tente novamente.',
    ));
  }
}

export async function buscarPerfil() {
  try {
    const data = await requisitarPerfil(
      '/profile',
      { method: 'GET' },
      'Não foi possível carregar os dados do seu perfil agora.',
    );
    return data?.profile || data;
  } catch (error) {
    console.error('Erro ao buscar perfil do usuário:', error);
    throw createFriendlyError(parseUnexpectedError(
      error,
      'Não foi possível carregar os dados do seu perfil agora.',
    ));
  }
}

export async function buscarUsuario(id) {
  try {
    const data = await requisitarPerfil(
      `/users/${id}`,
      { method: 'GET' },
      'Não foi possível carregar os dados do dono da peça agora.',
    );
    return data?.user || data;
  } catch (error) {
    console.error('Erro ao buscar usuário por id:', error);
    throw createFriendlyError(parseUnexpectedError(
      error,
      'Não foi possível carregar os dados do dono da peça agora.',
    ));
  }
}
