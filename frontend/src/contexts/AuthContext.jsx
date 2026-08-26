import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import supabaseAuthGateway from '../features/usuarios/infrastructure/supabaseAuthGateway';

const AuthContext = createContext(null);

export function AuthProvider({ children, authGateway = supabaseAuthGateway }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authGateway.estaConfigurado()) {
      console.error('Supabase não configurado. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
      setUser(null);
      setSession(null);
      setLoading(false);
      return undefined;
    }

    let montado = true;
    authGateway.obterSessao()
      .then((sessaoAtual) => {
        if (!montado) return;
        setSession(sessaoAtual);
        setUser(sessaoAtual?.user || null);
      })
      .catch((error) => {
        console.error('Erro ao recuperar sessão do Supabase:', error);
        if (montado) { setSession(null); setUser(null); }
      })
      .finally(() => { if (montado) setLoading(false); });

    const cancelarObservacao = authGateway.observarSessao((sessaoAtual) => {
      setSession(sessaoAtual);
      setUser(sessaoAtual?.user || null);
      setLoading(false);
    });

    return () => { montado = false; cancelarObservacao?.(); };
  }, [authGateway]);

  async function register(dados) {
    return authGateway.cadastrar(dados, {
      resposta: 'Não foi possível criar sua conta agora. Revise os dados e tente novamente.',
      inesperado: 'Não foi possível criar sua conta agora. Tente novamente.',
    });
  }

  async function login(email, password) {
    const data = await authGateway.entrar(email, password);
    setSession(data?.session || null);
    setUser(data?.user || null);
    return data;
  }

  async function logout() {
    await authGateway.sair();
    setSession(null);
    setUser(null);
  }

  const resetPassword = (email) => authGateway.solicitarRedefinicao(
    email,
    `${window.location.origin}/redefinir-senha`,
  );

  async function updatePassword(newPassword) {
    const data = await authGateway.atualizarSenha(newPassword);
    setSession(null);
    setUser(null);
    return data;
  }

  async function getToken() {
    return session?.access_token || authGateway.obterToken();
  }

  const value = useMemo(() => ({
    user, session, loading, register, login, logout, resetPassword, updatePassword, getToken,
  }), [user, session, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return context;
}
