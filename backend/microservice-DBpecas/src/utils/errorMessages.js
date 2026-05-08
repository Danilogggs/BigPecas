const SUPABASE_ERROR_MESSAGES = {
  PGRST116: {
    statusCode: 404,
    message: 'Não encontramos os dados solicitados.'
  },
  '23505': {
    statusCode: 409,
    message: 'Já existe um cadastro com os dados informados.'
  },
  '23503': {
    statusCode: 400,
    message: 'Um ou mais dados informados não foram encontrados.'
  },
  '23502': {
    statusCode: 400,
    message: 'Preencha os campos obrigatórios antes de continuar.'
  },
  '22P02': {
    statusCode: 400,
    message: 'Um ou mais dados informados são inválidos.'
  },
  '42P01': {
    statusCode: 503,
    message: 'Uma tabela necessária do Supabase ainda não foi configurada.'
  },
  '42703': {
    statusCode: 503,
    message: 'Uma coluna necessária do Supabase ainda não foi configurada.'
  }
};

function resolveFriendlyError(error) {
  if (error?.statusCode && error?.message) {
    return {
      statusCode: error.statusCode,
      message: error.message
    };
  }

  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return {
      statusCode: 400,
      message: 'Os dados enviados estão em um formato inválido.'
    };
  }

  if (error?.code && SUPABASE_ERROR_MESSAGES[error.code]) {
    return SUPABASE_ERROR_MESSAGES[error.code];
  }

  const rawMessage = typeof error?.message === 'string' ? error.message.toLowerCase() : '';
  const rawStatus = Number(error?.status || error?.statusCode);

  if (rawMessage.includes('invalid jwt') || rawMessage.includes('jwt expired') || rawMessage.includes('invalid token')) {
    return {
      statusCode: 401,
      message: 'Sua autenticação não pôde ser validada. Faça login novamente.'
    };
  }

  if (rawMessage.includes('service_role') || rawMessage.includes('api key') || rawMessage.includes('supabase_url')) {
    return {
      statusCode: 503,
      message: 'A conexão com o Supabase ainda não foi configurada corretamente no servidor.'
    };
  }

  if (rawStatus >= 400 && rawStatus < 500) {
    return {
      statusCode: rawStatus,
      message: 'Não foi possível processar a solicitação. Revise os dados e tente novamente.'
    };
  }

  return {
    statusCode: 500,
    message: 'Ocorreu um erro interno. Tente novamente em instantes.'
  };
}

module.exports = {
  resolveFriendlyError
};
