const FIREBASE_ERROR_MESSAGES = {
  'auth/id-token-expired': {
    statusCode: 401,
    message: 'Sua sessão expirou. Faça login novamente.'
  },
  'auth/id-token-revoked': {
    statusCode: 401,
    message: 'Sua sessão foi encerrada. Faça login novamente.'
  },
  'auth/invalid-id-token': {
    statusCode: 401,
    message: 'Sua autenticação não pôde ser validada. Faça login novamente.'
  },
  'auth/argument-error': {
    statusCode: 401,
    message: 'Sua autenticação não pôde ser validada. Faça login novamente.'
  },
  'auth/user-disabled': {
    statusCode: 403,
    message: 'Sua conta não pode acessar o sistema no momento.'
  },
  5: {
    statusCode: 503,
    message: 'O serviço está temporariamente indisponível. Tente novamente em instantes.'
  },
  7: {
    statusCode: 403,
    message: 'Você não tem permissão para acessar este recurso.'
  },
  16: {
    statusCode: 401,
    message: 'Sua autenticação não pôde ser validada. Faça login novamente.'
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

  if (error?.code && FIREBASE_ERROR_MESSAGES[error.code]) {
    return FIREBASE_ERROR_MESSAGES[error.code];
  }

  return {
    statusCode: 500,
    message: 'Ocorreu um erro interno. Tente novamente em instantes.'
  };
}

module.exports = {
  resolveFriendlyError
};
