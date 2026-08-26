const DEFAULT_MESSAGES = {
  network: 'Não foi possível se conectar ao servidor. Tente novamente em instantes.',
  generic: 'Não foi possível concluir a operação. Tente novamente.',
  list: 'Não foi possível carregar os dados agora. Tente novamente em instantes.',
  create: 'Não foi possível salvar os dados. Revise as informações e tente novamente.',
  update: 'Não foi possível atualizar os dados. Tente novamente.',
  delete: 'Não foi possível excluir o item. Tente novamente.',
  auth: 'Você precisa entrar novamente para continuar.',
};

const AUTH_CODE_MESSAGES = {
  invalid_credentials: 'Email ou senha incorretos.',
  email_not_confirmed: 'Confirme seu email antes de entrar.',
  user_banned: 'Esta conta foi desativada. Entre em contato com o suporte.',
  email_exists: 'Este email já está cadastrado.',
  user_already_exists: 'Este email já está cadastrado.',
  weak_password: 'A senha deve ter pelo menos 8 caracteres e não pode ser fácil de adivinhar.',
  same_password: 'A nova senha deve ser diferente da senha anterior.',
  password_not_different: 'A nova senha deve ser diferente da senha anterior.',
  validation_failed: 'Alguns dados informados são inválidos. Revise e tente novamente.',
  over_request_rate_limit: 'Muitas tentativas realizadas. Aguarde um instante e tente novamente.',
  over_email_send_rate_limit: 'O limite de envio de emails foi atingido. Aguarde e tente novamente.',
  email_address_invalid: 'Informe um endereço de email válido.',
  email_address_not_authorized: 'Este endereço não está autorizado a receber emails do projeto.',
  otp_expired: 'O código ou link informado expirou. Solicite um novo.',
  otp_disabled: 'O acesso por código está indisponível no momento.',
  bad_jwt: 'Sua sessão é inválida. Entre novamente para continuar.',
  session_not_found: 'Sua sessão expirou. Entre novamente para continuar.',
  refresh_token_not_found: 'Sua sessão expirou. Entre novamente para continuar.',
  refresh_token_already_used: 'Sua sessão expirou. Entre novamente para continuar.',
  signup_disabled: 'Novos cadastros estão temporariamente desativados.',
  reauthentication_needed: 'Por segurança, confirme sua identidade antes de continuar.',
  reauthentication_not_valid: 'Não foi possível confirmar sua identidade. Tente novamente.',
  password_does_not_match: 'A senha atual está incorreta.',
  captcha_failed: 'Não foi possível validar a verificação de segurança. Tente novamente.',
  provider_disabled: 'Este método de acesso está desativado.',
  flow_state_expired: 'Este link expirou. Inicie o processo novamente.',
  flow_state_not_found: 'Este link é inválido ou já foi utilizado.',
};

const MESSAGE_TRANSLATIONS = [
  [['new password should be different from the old password', 'new password should be different from old password'], 'A nova senha deve ser diferente da senha anterior.'],
  [['invalid login credentials', 'invalid credentials'], 'Email ou senha incorretos.'],
  [['email not confirmed'], 'Confirme seu email antes de entrar.'],
  [['user already registered', 'already registered', 'already been registered', 'user already exists'], 'Este email já está cadastrado.'],
  [['password should be at least', 'password is too short', 'weak password'], 'A senha deve ter pelo menos 8 caracteres e não pode ser fácil de adivinhar.'],
  [['email rate limit exceeded', 'rate limit exceeded', 'too many requests'], 'Muitas tentativas realizadas. Aguarde um instante e tente novamente.'],
  [['error sending recovery email', 'failed to send recovery email'], 'Não foi possível enviar o email de recuperação agora. Tente novamente.'],
  [['error sending confirmation email', 'failed to send confirmation email'], 'Não foi possível enviar o email de confirmação agora. Tente novamente.'],
  [['email address not authorized'], 'Este endereço não está autorizado a receber emails do projeto.'],
  [['email address is invalid', 'invalid email'], 'Informe um endereço de email válido.'],
  [['otp expired', 'token has expired', 'token expired'], 'O código ou link informado expirou. Solicite um novo.'],
  [['invalid token', 'invalid jwt'], 'O link ou a sessão informada é inválida. Solicite um novo acesso.'],
  [['session not found', 'refresh token not found'], 'Sua sessão expirou. Entre novamente para continuar.'],
  [['captcha verification process failed', 'captcha failed'], 'Não foi possível validar a verificação de segurança. Tente novamente.'],
];

function extractMessageFromPayload(payload) {
  if (!payload) return '';
  if (typeof payload === 'string') return payload.trim();

  if (Array.isArray(payload?.errors) && payload.errors.length) {
    const joinedErrors = payload.errors
      .map((item) => item?.msg || item?.message || item)
      .filter(Boolean)
      .join(', ');
    if (joinedErrors) return joinedErrors;
  }

  return payload.message || payload.error_description || payload.error || payload.details || '';
}

function translateKnownMessage(message) {
  if (!message || typeof message !== 'string') return '';
  const lowerMessage = message.trim().toLowerCase();

  for (const [fragments, translation] of MESSAGE_TRANSLATIONS) {
    if (fragments.some((fragment) => lowerMessage.includes(fragment))) return translation;
  }

  return '';
}

function looksLikeUntranslatedTechnicalMessage(message) {
  const lowerMessage = message.toLowerCase();
  const englishFragments = [
    'error ', 'failed ', 'invalid ', 'password ', 'user ', 'request ',
    'should ', 'must ', 'not found', 'already ', 'unable ', 'expired', 'unauthorized',
  ];
  return englishFragments.some((fragment) => lowerMessage.includes(fragment));
}

function sanitizeMessage(message, fallbackMessage) {
  if (!message || typeof message !== 'string') return fallbackMessage;

  const trimmedMessage = message.trim();
  const lowerMessage = trimmedMessage.toLowerCase();
  const translatedMessage = translateKnownMessage(trimmedMessage);
  if (translatedMessage) return translatedMessage;

  const blockedFragments = [
    'failed to fetch', 'networkerror', 'typeerror', 'fetch failed', 'internal server error',
    'validation failed', 'duplicate entry', 'sql', 'stack', 'syntaxerror', 'unexpected token',
    'json', 'auth/', 'jwt', 'timeout', 'cors', 'econnrefused', 'enotfound', 'supabase',
    'postgrest', 'pgrst', 'gomail', 'smtp',
  ];

  if (
    blockedFragments.some((fragment) => lowerMessage.includes(fragment)) ||
    looksLikeUntranslatedTechnicalMessage(trimmedMessage)
  ) {
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

  const payloadCode = typeof payload === 'object' ? payload?.code : '';
  if (payloadCode && AUTH_CODE_MESSAGES[payloadCode]) return AUTH_CODE_MESSAGES[payloadCode];

  const messageFromPayload = sanitizeMessage(extractMessageFromPayload(payload), '');
  if (messageFromPayload) return messageFromPayload;

  const statusMessages = {
    400: 'Alguns dados informados são inválidos. Revise e tente novamente.',
    401: 'Você precisa entrar na sua conta para continuar.',
    403: 'Você não tem permissão para realizar esta ação.',
    404: 'O item solicitado não foi encontrado.',
    409: 'A operação não pode ser realizada no estado atual.',
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
    error instanceof TypeError || rawMessage.includes('failed to fetch') ||
    rawMessage.includes('networkerror') || rawMessage.includes('load failed') ||
    rawMessage.includes('fetch failed') || rawMessage.includes('network request failed')
  ) {
    return DEFAULT_MESSAGES.network;
  }

  return sanitizeMessage(error?.message, fallbackMessage);
}

export function mapSupabaseAuthError(error, context = 'generic') {
  const code = error?.code || '';
  const rawStatus = Number(error?.status || error?.statusCode);
  const translatedMessage = translateKnownMessage(error?.message);

  const contextMessages = {
    login: {
      validation_failed: 'Informe um email e uma senha válidos.',
      over_request_rate_limit: 'Muitas tentativas de acesso. Aguarde alguns instantes e tente novamente.',
    },
    register: {
      validation_failed: 'Alguns dados informados são inválidos. Revise e tente novamente.',
    },
    resetPassword: {
      validation_failed: 'Informe um email válido.',
      over_request_rate_limit: 'Muitas tentativas realizadas. Aguarde um instante e tente novamente.',
    },
    updatePassword: {
      validation_failed: 'Informe uma senha válida.',
      same_password: 'A nova senha deve ser diferente da senha anterior.',
      password_not_different: 'A nova senha deve ser diferente da senha anterior.',
    },
  };

  if (translatedMessage) return translatedMessage;
  if (contextMessages[context]?.[code]) return contextMessages[context][code];
  if (AUTH_CODE_MESSAGES[code]) return AUTH_CODE_MESSAGES[code];
  if (rawStatus === 429) return AUTH_CODE_MESSAGES.over_request_rate_limit;

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
