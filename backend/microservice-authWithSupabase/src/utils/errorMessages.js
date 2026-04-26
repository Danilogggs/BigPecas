const SUPABASE_ERROR_MESSAGES = {
  email_exists: {
    statusCode: 409,
    message: 'Este email já está cadastrado.',
  },
  user_already_exists: {
    statusCode: 409,
    message: 'Este email já está cadastrado.',
  },
  validation_failed: {
    statusCode: 400,
    message: 'Alguns dados informados são inválidos. Revise e tente novamente.',
  },
  weak_password: {
    statusCode: 400,
    message: 'Sua senha é muito fraca. Use pelo menos 8 caracteres.',
  },
  invalid_credentials: {
    statusCode: 401,
    message: 'Email ou senha incorretos.',
  },
  PGRST116: {
    statusCode: 404,
    message: 'Não encontramos os dados solicitados.',
  },
  '23505': {
    statusCode: 409,
    message: 'Já existe um cadastro com os dados informados.',
  },
  '23503': {
    statusCode: 400,
    message: 'Um ou mais dados informados não foram encontrados.',
  },
  '42P01': {
    statusCode: 503,
    message: 'A tabela de usuários do Supabase ainda não foi configurada.',
  },
};

function resolveFriendlyError(error) {
  if (error?.statusCode && error?.message) {
    return {
      statusCode: error.statusCode,
      message: error.message,
    };
  }

  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return {
      statusCode: 400,
      message: 'Os dados enviados estão em um formato inválido.',
    };
  }

  if (error?.code === '23502') {
    const rawMessage = typeof error?.message === 'string' ? error.message.toLowerCase() : '';

    if (rawMessage.includes('password_hash')) {
      return {
        statusCode: 503,
        message: 'A coluna password_hash da tabela users precisa permitir valor nulo, porque a senha agora fica armazenada no Supabase Auth.',
      };
    }

    return {
      statusCode: 400,
      message: 'Preencha os campos obrigatórios antes de continuar.',
    };
  }

  if (error?.code && SUPABASE_ERROR_MESSAGES[error.code]) {
    return SUPABASE_ERROR_MESSAGES[error.code];
  }

  const rawMessage = typeof error?.message === 'string' ? error.message.toLowerCase() : '';
  const rawStatus = Number(error?.status || error?.statusCode);

  if (rawMessage.includes('already registered') || rawMessage.includes('already been registered')) {
    return {
      statusCode: 409,
      message: 'Este email já está cadastrado.',
    };
  }

  if (rawMessage.includes('invalid jwt') || rawMessage.includes('jwt expired') || rawMessage.includes('invalid token')) {
    return {
      statusCode: 401,
      message: 'Sua autenticação não pôde ser validada. Faça login novamente.',
    };
  }

  if (rawMessage.includes('service_role') || rawMessage.includes('api key')) {
    return {
      statusCode: 503,
      message: 'A autenticação do Supabase ainda não foi configurada corretamente no servidor.',
    };
  }

  if (rawStatus >= 400 && rawStatus < 500) {
    return {
      statusCode: rawStatus,
      message: 'Não foi possível processar a solicitação. Revise os dados e tente novamente.',
    };
  }

  return {
    statusCode: 500,
    message: 'Ocorreu um erro interno. Tente novamente em instantes.',
  };
}

module.exports = {
  resolveFriendlyError,
};
