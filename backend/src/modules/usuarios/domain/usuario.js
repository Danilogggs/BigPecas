function normalizarTexto(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

function normalizarEmail(valor) {
  return normalizarTexto(valor).toLowerCase();
}

function normalizarBooleano(valor, padrao = true) {
  if (typeof valor === 'boolean') return valor;
  if (typeof valor === 'number') return valor === 1;
  if (typeof valor === 'string') {
    const normalizado = valor.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalizado)) return true;
    if (['false', '0', 'no', 'off'].includes(normalizado)) return false;
  }
  return padrao;
}

function sanitizarUsuario(body = {}) {
  return {
    full_name: normalizarTexto(body.full_name || body.nome),
    email: normalizarEmail(body.email),
    gender: normalizarTexto(body.gender || body.genero),
    cep: normalizarTexto(body.cep),
    tipo_usuario: 'ambos',
    nome_loja: normalizarTexto(body.nome_loja),
    descricao_loja: normalizarTexto(body.descricao_loja),
    telefone: normalizarTexto(body.telefone),
    receber_email_notificacao_venda: normalizarBooleano(
      body.receber_email_notificacao_venda,
      true,
    ),
  };
}

function sanitizarCadastro(body = {}) {
  return {
    ...sanitizarUsuario(body),
    password: typeof body.password === 'string' ? body.password : '',
  };
}

const emailValido = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const idInteiro = (valor) => /^\d+$/.test(String(valor));
const idUuid = (valor) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(valor));
const emailConfirmado = (user) => Boolean(user?.email_confirmed_at || user?.confirmed_at);

function normalizarPerfil(perfil) {
  return perfil
    ? { ...perfil, tipo_usuario: 'ambos', is_admin: perfil.is_admin === true }
    : perfil;
}

function criarMetadadosUsuario(usuario) {
  return {
    full_name: usuario.full_name,
    gender: usuario.gender || null,
    cep: usuario.cep || null,
    tipo_usuario: usuario.tipo_usuario || null,
    nome_loja: usuario.nome_loja || null,
    descricao_loja: usuario.descricao_loja || null,
    telefone: usuario.telefone || null,
    receber_email_notificacao_venda: usuario.receber_email_notificacao_venda ?? true,
  };
}

function criarPayloadPerfil(usuario, opcoes = {}) {
  const { incluirEmail = true, incluirVerificacao = false, agora = new Date().toISOString() } = opcoes;
  const payload = { ...criarMetadadosUsuario(usuario), updated_at: agora };
  if (incluirEmail) payload.email = usuario.email;
  if (incluirVerificacao) payload.email_verificado = Boolean(usuario.email_verificado);
  return payload;
}

function criarPerfilAlternativo(authUser) {
  const metadata = authUser?.user_metadata || {};
  return {
    full_name: metadata.full_name || '',
    email: authUser?.email || '',
    gender: metadata.gender || '',
    cep: metadata.cep || '',
    tipo_usuario: 'ambos',
    nome_loja: metadata.nome_loja || '',
    descricao_loja: metadata.descricao_loja || '',
    telefone: metadata.telefone || '',
    receber_email_notificacao_venda: metadata.receber_email_notificacao_venda !== false,
    email_verificado: emailConfirmado(authUser),
    is_admin: false,
  };
}

module.exports = {
  criarMetadadosUsuario,
  criarPayloadPerfil,
  criarPerfilAlternativo,
  emailConfirmado,
  emailValido,
  idInteiro,
  idUuid,
  normalizarEmail,
  normalizarPerfil,
  normalizarTexto,
  sanitizarCadastro,
  sanitizarUsuario,
};
