import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getSupabaseClient, hasSupabaseConfig } from '../services/supabase';
import { AUTH_API_URL } from '../services/apiConfig';
import { createFriendlyError, parseErrorResponse, parseUnexpectedError } from '../utils/friendlyErrors';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasSupabaseConfig) {
      console.error('Supabase não configurado. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
      setUser(null);
      setSession(null);
      setLoading(false);
      return undefined;
    }

    const supabase = getSupabaseClient();
    let isMounted = true;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) throw error;

        if (isMounted) {
          setSession(data?.session || null);
          setUser(data?.session?.user || null);
        }
      })
      .catch((error) => {
        console.error('Erro ao recuperar sessão do Supabase:', error);
        if (isMounted) {
          setSession(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession || null);
      setUser(currentSession?.user || null);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  async function register(dados) {
    try {
      const response = await fetch(`${AUTH_API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dados),
      });

      if (!response.ok) {
        const mensagem = await parseErrorResponse(
          response,
          'Não foi possível criar sua conta agora. Revise os dados e tente novamente.'
        );
        throw createFriendlyError(mensagem);
      }

      return response.json();
    } catch (error) {
      console.error('Erro ao cadastrar usuário:', error);
      throw createFriendlyError(
        parseUnexpectedError(error, 'Não foi possível criar sua conta agora. Tente novamente.')
      );
    }
  }

  async function login(email, password) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      throw error;
    }

    setSession(data?.session || null);
    setUser(data?.user || null);

    return data;
  }

  async function logout() {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }

    setSession(null);
    setUser(null);
  }

  async function resetPassword(email) {
    const supabase = getSupabaseClient();
    const redirectTo = `${window.location.origin}/redefinir-senha`;

    const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo,
    });

    if (error) {
      throw error;
    }

    return data;
  }

  async function updatePassword(newPassword) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw error;
    }

    await supabase.auth.signOut();
    setSession(null);
    setUser(null);

    return data;
  }

  async function getToken() {
    if (session?.access_token) {
      return session.access_token;
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      throw error;
    }

    return data?.session?.access_token || null;
  }

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      register,
      login,
      logout,
      resetPassword,
      updatePassword,
      getToken,
    }),
    [user, session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }

  return context;
}
