const AppError = require('../../../utils/AppError');
const {
  criarPerfilAlternativo,
  emailConfirmado,
  emailValido,
  idInteiro,
  idUuid,
  normalizarEmail,
  normalizarTexto,
  sanitizarCadastro,
  sanitizarUsuario,
} = require('../domain/usuario');

function criarUsuariosUseCases({ repository, emailConfirmRedirectTo }) {
  async function cadastrar(dados) {
    const usuario = sanitizarCadastro(dados);
    if (!repository.authPublicoConfigurado) {
      throw new AppError(503, 'Configure SUPABASE_ANON_KEY no microserviço de autenticação.');
    }
    if (!usuario.full_name) throw new AppError(400, 'Informe o nome completo.');
    if (!usuario.email || !emailValido(usuario.email)) throw new AppError(400, 'Informe um email válido.');
    if (!usuario.password || usuario.password.length < 8) {
      throw new AppError(400, 'A senha deve ter pelo menos 8 caracteres.');
    }
    if (await repository.buscarPerfilPorEmail(usuario.email)) {
      throw new AppError(409, 'Este email já está cadastrado.');
    }

    const { data, error } = await repository.cadastrarAuth({
      email: usuario.email,
      password: usuario.password,
      usuario,
      redirectTo: emailConfirmRedirectTo,
    });
    if (error) throw error;
    const authUser = data?.user;
    if (!authUser?.id) throw new AppError(500, 'Não foi possível criar o usuário no Supabase.');

    const confirmado = emailConfirmado(authUser);
    const profile = await repository.salvarPerfil(
      { ...usuario, email_verificado: confirmado },
      { forcarVerificadoAoInserir: confirmado },
    );
    return {
      message: 'Conta criada. Verifique seu email para confirmar o cadastro.',
      emailVerificationRequiredForSelling: true,
      authUser: { id: authUser.id, email: authUser.email },
      profile,
    };
  }

  async function obterUsuarioAtual(authUser) {
    const email = normalizarEmail(authUser.email);
    let profile = email ? await repository.buscarPerfilPorEmail(email) : null;
    if (profile) profile = await repository.sincronizarVerificacao(profile, authUser, emailConfirmado(authUser));
    return {
      message: 'Token validado com sucesso no backend.',
      user: {
        id: authUser.id,
        email: authUser.email || null,
        profile: profile || criarPerfilAlternativo(authUser),
      },
    };
  }

  async function obterUsuarioPorId(valor) {
    const id = normalizarTexto(valor);
    if (!id) throw new AppError(400, 'Informe o id do usuário.');
    if (!idInteiro(id) && !idUuid(id)) throw new AppError(400, 'Informe um id de usuário válido.');

    if (idInteiro(id)) {
      const profile = await repository.buscarPerfilPorId(Number(id));
      if (!profile) throw new AppError(404, 'Usuário não encontrado.');
      return { user: { id: profile.id, email: profile.email || null, profile } };
    }

    const { data, error } = await repository.buscarAuthPorId(id);
    if (error || !data?.user) throw new AppError(404, 'Usuário não encontrado.');
    const email = normalizarEmail(data.user.email);
    const profile = email ? await repository.buscarPerfilPorEmail(email) : null;
    return {
      user: {
        id: data.user.id,
        email: data.user.email || null,
        profile: profile || criarPerfilAlternativo(data.user),
      },
    };
  }

  async function salvarPerfil({ authUser, dados }) {
    const body = sanitizarUsuario(dados);
    const email = normalizarEmail(authUser.email);
    if (!email || !emailValido(email)) {
      throw new AppError(400, 'Não foi possível identificar o email do usuário autenticado.');
    }
    const usuario = { ...body, email, full_name: body.full_name };
    if (!usuario.full_name) throw new AppError(400, 'Informe o nome completo.');

    const existente = await repository.buscarPerfilPorEmail(email);
    let profile = await repository.salvarPerfil(usuario, {
      forcarVerificadoAoInserir: emailConfirmado(authUser),
    });
    await repository.atualizarMetadados(authUser.id, usuario);
    profile = await repository.sincronizarVerificacao(profile, authUser, emailConfirmado(authUser));
    return {
      status: existente ? 200 : 201,
      data: {
        message: existente ? 'Perfil atualizado com sucesso.' : 'Perfil salvo com sucesso.',
        profile,
      },
    };
  }

  async function obterPerfil(authUser) {
    const email = normalizarEmail(authUser.email);
    if (!email) throw new AppError(400, 'Não foi possível identificar o email do usuário autenticado.');
    let profile = await repository.buscarPerfilPorEmail(email);
    if (!profile) return criarPerfilAlternativo(authUser);
    profile = await repository.sincronizarVerificacao(profile, authUser, emailConfirmado(authUser));
    return profile;
  }

  return Object.freeze({ cadastrar, obterPerfil, obterUsuarioAtual, obterUsuarioPorId, salvarPerfil });
}

module.exports = criarUsuariosUseCases;
