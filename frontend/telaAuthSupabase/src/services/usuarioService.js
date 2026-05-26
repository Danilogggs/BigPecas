import {
  createFriendlyError,
  parseErrorResponse,
  parseUnexpectedError,
} from '../utils/friendlyErrors';
import { getSupabaseClient } from './supabase';

const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL || import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function getAuthToken() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw createFriendlyError('Você precisa entrar novamente para continuar.');
  }

  const token = data?.session?.access_token;

  if (!token) {
    throw createFriendlyError('Você precisa estar autenticado para continuar.');
  }

  return token;
}

export async function salvarPerfilUsuario(dados) {
  try {
    const token = await getAuthToken();

    const response = await fetch(`${AUTH_API_URL}/api/auth/profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(dados),
    });

    if (!response.ok) {
      const mensagem = await parseErrorResponse(
        response,
        'Não foi possível salvar os dados do seu perfil agora. Revise as informações e tente novamente.'
      );
      throw createFriendlyError(mensagem);
    }

    const data = await response.json();
    return data?.profile || data;
  } catch (error) {
    console.error('Erro ao salvar perfil do usuário:', error);
    throw createFriendlyError(
      parseUnexpectedError(
        error,
        'Não foi possível salvar os dados do seu perfil agora. Tente novamente.'
      )
    );
  }
}

export async function buscarPerfilUsuario() {
  try {
    const token = await getAuthToken();

    const response = await fetch(`${AUTH_API_URL}/api/auth/profile`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const mensagem = await parseErrorResponse(
        response,
        'Não foi possível carregar os dados do seu perfil agora.'
      );
      throw createFriendlyError(mensagem);
    }

    const data = await response.json();
    return data?.profile || data;
  } catch (error) {
    console.error('Erro ao buscar perfil do usuário:', error);
    throw createFriendlyError(
      parseUnexpectedError(error, 'Não foi possível carregar os dados do seu perfil agora.')
    );
  }
}

export async function buscarUsuarioPorId(id) {
  try {
    const token = await getAuthToken();

    const response = await fetch(`${AUTH_API_URL}/api/auth/users/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const mensagem = await parseErrorResponse(
        response,
        'NÃ£o foi possÃ­vel carregar os dados do dono da peÃ§a agora.'
      );
      throw createFriendlyError(mensagem);
    }

    const data = await response.json();
    return data?.user || data;
  } catch (error) {
    console.error('Erro ao buscar usuÃ¡rio por id:', error);
    throw createFriendlyError(
      parseUnexpectedError(error, 'NÃ£o foi possÃ­vel carregar os dados do dono da peÃ§a agora.')
    );
  }
}

export const cadastrarUsuario = salvarPerfilUsuario;
