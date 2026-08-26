const {
  criarMetadadosUsuario,
  criarPayloadPerfil,
  normalizarPerfil,
} = require('../domain/usuario');

function criarSupabaseUsuariosRepository({ supabaseAdmin, supabasePublic, userTable }) {
  async function buscarPerfilPorEmail(email) {
    const { data, error } = await supabaseAdmin
      .from(userTable).select('*').eq('email', email).maybeSingle();
    if (error) throw error;
    return normalizarPerfil(data);
  }

  async function buscarPerfilPorId(id) {
    const { data, error } = await supabaseAdmin
      .from(userTable).select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return normalizarPerfil(data);
  }

  async function salvarPerfil(usuario, { forcarVerificadoAoInserir = false } = {}) {
    const existente = await buscarPerfilPorEmail(usuario.email);
    const payload = criarPayloadPerfil(usuario, {
      incluirEmail: !existente,
      incluirVerificacao: !existente,
    });

    if (existente) {
      const { data, error } = await supabaseAdmin
        .from(userTable).update(payload).eq('email', usuario.email).select('*').single();
      if (error) throw error;
      return data;
    }

    const { data, error } = await supabaseAdmin
      .from(userTable)
      .insert({
        ...payload,
        email: usuario.email,
        email_verificado: forcarVerificadoAoInserir ? true : Boolean(usuario.email_verificado),
        created_at: new Date().toISOString(),
      })
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  async function sincronizarVerificacao(perfil, authUser, confirmado) {
    if (!perfil || !confirmado || perfil.email_verificado === true) return perfil;
    const { data, error } = await supabaseAdmin
      .from(userTable)
      .update({ email_verificado: true, updated_at: new Date().toISOString() })
      .eq('email', perfil.email)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    return normalizarPerfil(data) || { ...perfil, tipo_usuario: 'ambos', email_verificado: true };
  }

  async function cadastrarAuth({ email, password, usuario, redirectTo }) {
    return supabasePublic.auth.signUp({
      email,
      password,
      options: { data: criarMetadadosUsuario(usuario), emailRedirectTo: redirectTo },
    });
  }

  async function atualizarMetadados(authUserId, usuario) {
    if (!authUserId) return null;
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
      user_metadata: criarMetadadosUsuario(usuario),
    });
    if (error) throw error;
    return data?.user || null;
  }

  async function buscarAuthPorId(id) {
    return supabaseAdmin.auth.admin.getUserById(id);
  }

  return Object.freeze({
    authPublicoConfigurado: Boolean(supabasePublic),
    atualizarMetadados,
    buscarAuthPorId,
    buscarPerfilPorEmail,
    buscarPerfilPorId,
    cadastrarAuth,
    salvarPerfil,
    sincronizarVerificacao,
  });
}

module.exports = criarSupabaseUsuariosRepository;
