const DEFAULT_MESSAGES = {
  network: 'Não foi possível se conectar ao servidor. Tente novamente em instantes.',
  generic: 'Não foi possível concluir a operação. Tente novamente.',
  list: 'Não foi possível carregar os dados agora. Tente novamente em instantes.',
  create: 'Não foi possível salvar os dados. Revise as informações e tente novamente.',
  update: 'Não foi possível atualizar os dados. Tente novamente.',
  delete: 'Não foi possível excluir o item. Tente novamente.',
  auth: 'Você precisa entrar novamente para continuar.',
};

function extractMessageFromPayload(payload) {
  if (!payload) return '';

  if (typeof payload === 'string') {
    return payload.trim();
  }

  if (Array.isArray(payload?.errors) && payload.errors.length) {
    const joinedErrors = payload.errors
      .map((item) => item?.msg || item?.message || item)
      .filter(Boolean)
      .join(', ');

    if (joinedErrors) return joinedErrors;
  }

  return payload.message || payload.error || payload.details || '';
}

function sanitizeMessage(message, fallbackMessage) {
  if (!message || typeof message !== 'string') return fallbackMessage;

  const trimmedMessage = message.trim();
  const lowerMessage = trimmedMessage.toLowerCase();

  const blockedFragments = [
    'failed to fetch',
    'networkerror',
    'typeerror',
    'fetch failed',
    'internal server error',
    'validation failed',
    'duplicate entry',
    'sql',
    'stack',
    'syntaxerror',
    'unexpected token',
    'json',
    'auth/',
    'jwt',
    'token',
    'timeout',
    'cors',
    'econnrefused',
    'enotfound',
    'supabase',
    'postgrest',
    'pgrst',
  ];

  if (blockedFragments.some((fragment) => lowerMessage.includes(fragment))) {
    return fallbackMessage;
  }

  return trimmedMessage;
}

export async function parseErrorResponse(response, fallbackMessage = DEFAULT_MESSAGES.generic) {
  let payload = null;

  try {
    payload = await response.clone().json();
  } catch {
    try {
      payload = await response.clone().text();
    } catch {
      payload = null;
    }
  }

  const messageFromPayload = sanitizeMessage(extractMessageFromPayload(payload), '');

  if (messageFromPayload) {
    return messageFromPayload;
  }

  const statusMessages = {
    400: 'Alguns dados informados são inválidos. Revise e tente novamente.',
    401: 'Você precisa entrar na sua conta para continuar.',
    403: 'Você não tem permissão para realizar esta ação.',
    404: 'O item solicitado não foi encontrado.',
    409: 'Já existe um cadastro com essas informações.',
    422: 'Alguns dados informados são inválidos. Revise e tente novamente.',
    429: 'Muitas tentativas realizadas. Aguarde um instante e tente novamente.',
    500: 'Ocorreu um erro interno. Tente novamente em instantes.',
    502: 'O serviço está indisponível no momento. Tente novamente em instantes.',
    503: 'O serviço está temporariamente indisponível. Tente novamente em instantes.',
  };

  return statusMessages[response.status] || fallbackMessage;
}

export function parseUnexpectedError(error, fallbackMessage = DEFAULT_MESSAGES.generic) {
  if (error?.name === 'AbortError') {
    return 'A solicitação demorou mais do que o esperado. Tente novamente.';
  }

  const rawMessage = typeof error?.message === 'string' ? error.message.toLowerCase() : '';

  if (
    error instanceof TypeError ||
    rawMessage.includes('failed to fetch') ||
    rawMessage.includes('networkerror') ||
    rawMessage.includes('load failed') ||
    rawMessage.includes('fetch failed') ||
    rawMessage.includes('network request failed')
  ) {
    return DEFAULT_MESSAGES.network;
  }

  return sanitizeMessage(error?.message, fallbackMessage);
}

export function mapSupabaseAuthError(error, context = 'generic') {
  const code = error?.code || '';
  const rawStatus = Number(error?.status || error?.statusCode);
  const rawMessage = typeof error?.message === 'string' ? error.message.toLowerCase() : '';

  const contextMessages = {
    login: {
      invalid_credentials: 'Email ou senha incorretos.',
      email_not_confirmed: 'Confirme seu email antes de entrar.',
      user_banned: 'Esta conta foi desativada. Entre em contato com o suporte.',
      over_request_rate_limit: 'Muitas tentativas de acesso. Aguarde alguns instantes e tente novamente.',
    },
    register: {
      email_exists: 'Este email já está cadastrado.',
      user_already_exists: 'Este email já está cadastrado.',
      weak_password: 'Sua senha é muito fraca. Use pelo menos 8 caracteres.',
      validation_failed: 'Alguns dados informados são inválidos. Revise e tente novamente.',
    },
    resetPassword: {
      validation_failed: 'Informe um email válido.',
      over_request_rate_limit: 'Muitas tentativas realizadas. Aguarde um instante e tente novamente.',
    },
    updatePassword: {
      weak_password: 'Sua senha é muito fraca. Use pelo menos 8 caracteres.',
      validation_failed: 'Informe uma senha válida.',
      over_request_rate_limit: 'Muitas tentativas realizadas. Aguarde um instante e tente novamente.',
    },
  };

  if (contextMessages[context]?.[code]) {
    return contextMessages[context][code];
  }

  if (rawMessage.includes('invalid login credentials')) {
    return 'Email ou senha incorretos.';
  }

  if (rawMessage.includes('already registered') || rawMessage.includes('already been registered')) {
    return 'Este email já está cadastrado.';
  }

  if (rawMessage.includes('email not confirmed')) {
    return 'Confirme seu email antes de entrar.';
  }

  if (rawStatus === 429) {
    return 'Muitas tentativas realizadas. Aguarde um instante e tente novamente.';
  }

  const defaultMessages = {
    login: 'Não foi possível entrar agora. Verifique seus dados e tente novamente.',
    register: 'Não foi possível criar sua conta agora. Tente novamente.',
    resetPassword: 'Não foi possível enviar o email de recuperação agora. Tente novamente.',
    updatePassword: 'Não foi possível redefinir sua senha agora. Solicite um novo link e tente novamente.',
    generic: DEFAULT_MESSAGES.generic,
  };

  return parseUnexpectedError(error, defaultMessages[context] || defaultMessages.generic);
}


export function createFriendlyError(message) {
  return new Error(message || DEFAULT_MESSAGES.generic);
}

export const FRIENDLY_DEFAULT_MESSAGES = DEFAULT_MESSAGES;
