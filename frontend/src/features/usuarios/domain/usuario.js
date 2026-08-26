export const normalizarEmailUsuario = (email) => String(email || '').trim().toLowerCase();

export function criarEstadoPerfil(perfil = {}) {
  return {
    full_name: perfil.full_name || '',
    email: perfil.email || '',
    gender: perfil.gender || '',
    cep: perfil.cep || '',
    tipo_usuario: 'ambos',
    nome_loja: perfil.nome_loja || '',
    descricao_loja: perfil.descricao_loja || '',
    telefone: perfil.telefone || '',
    receber_email_notificacao_venda: perfil.receber_email_notificacao_venda !== false,
  };
}

export const perfilPodeVender = (perfil) => Boolean(
  perfil?.email_verificado && perfil?.nome_loja?.trim() && perfil?.descricao_loja?.trim(),
);

const REGRAS_PERFIL = Object.freeze({
  nome: /^[A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)+$/,
  cep: /^\d{5}-\d{3}$/,
  telefone: /^\(\d{2}\)\s\d{4,5}-\d{4}$/,
  loja: /^[A-Za-zÀ-ÿ0-9\s.'-]{3,150}$/,
});

export function formatarCepPerfil(valor) {
  const digits = valor.replace(/\D/g, '').slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

export function formatarTelefonePerfil(valor) {
  const digits = valor.replace(/\D/g, '').slice(0, 11);
  if (digits.length > 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length > 6) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  if (digits.length > 2) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return digits;
}

export function validarPerfilUsuario(form) {
  const erros = {};
  if (!form.full_name.trim()) erros.full_name = 'Informe seu nome completo.';
  else if (!REGRAS_PERFIL.nome.test(form.full_name.trim())) {
    erros.full_name = 'Digite nome e sobrenome usando apenas letras.';
  }
  if (!form.cep.trim()) erros.cep = 'Informe seu CEP.';
  else if (!REGRAS_PERFIL.cep.test(form.cep.trim())) {
    erros.cep = 'Digite um CEP válido no formato 00000-000.';
  }
  if (!form.telefone.trim()) erros.telefone = 'Informe seu telefone.';
  else if (!REGRAS_PERFIL.telefone.test(form.telefone.trim())) {
    erros.telefone = 'Digite um telefone válido com DDD. Ex: (41) 99999-9999.';
  }
  const informouLoja = Boolean(form.nome_loja.trim() || form.descricao_loja.trim());
  if (informouLoja && !form.nome_loja.trim()) erros.nome_loja = 'Informe o nome da loja.';
  else if (form.nome_loja.trim() && !REGRAS_PERFIL.loja.test(form.nome_loja.trim())) {
    erros.nome_loja = 'O nome da loja deve ter pelo menos 3 caracteres válidos.';
  }
  if (informouLoja && !form.descricao_loja.trim()) {
    erros.descricao_loja = 'Informe a descrição da loja.';
  }
  return erros;
}
