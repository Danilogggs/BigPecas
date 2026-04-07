const DATABASE_ERROR_MESSAGES = {
  ER_DUP_ENTRY: {
    statusCode: 409,
    message: 'Já existe um cadastro com os dados informados.'
  },
  ER_NO_REFERENCED_ROW_2: {
    statusCode: 400,
    message: 'Um ou mais dados informados não foram encontrados.'
  },
  ER_ROW_IS_REFERENCED_2: {
    statusCode: 409,
    message: 'Este item não pode ser removido porque está vinculado a outros registros.'
  },
  ER_BAD_NULL_ERROR: {
    statusCode: 400,
    message: 'Preencha os campos obrigatórios antes de continuar.'
  },
  ER_TRUNCATED_WRONG_VALUE: {
    statusCode: 400,
    message: 'Um ou mais dados informados são inválidos.'
  },
  ER_WRONG_VALUE_FOR_TYPE: {
    statusCode: 400,
    message: 'Um ou mais dados informados são inválidos.'
  },
  ER_DATA_TOO_LONG: {
    statusCode: 400,
    message: 'Um ou mais dados ultrapassam o limite permitido.'
  },
  ER_PARSE_ERROR: {
    statusCode: 400,
    message: 'Não foi possível processar a solicitação com os dados informados.'
  }
};

const CONNECTION_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'PROTOCOL_CONNECTION_LOST'
]);

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

  if (error?.code && DATABASE_ERROR_MESSAGES[error.code]) {
    return DATABASE_ERROR_MESSAGES[error.code];
  }

  if (error?.code && CONNECTION_ERROR_CODES.has(error.code)) {
    return {
      statusCode: 503,
      message: 'O serviço está indisponível no momento. Tente novamente em instantes.'
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
