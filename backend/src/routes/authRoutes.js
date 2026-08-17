const express = require('express');
const { supabaseAdmin, supabasePublic } = require('../config/supabaseClient');
const verifyToken = require('../middlewares/verifyToken');
const AppError = require('../utils/AppError');

const router = express.Router();
const USER_TABLE = process.env.SUPABASE_USER_TABLE || 'users';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

function getEmailConfirmRedirectTo() {
  return process.env.SUPABASE_EMAIL_CONFIRM_REDIRECT_TO || `${FRONTEND_URL}/login?emailConfirmado=1`;
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeEmail(value) {
  return normalizeString(value).toLowerCase();
}

function normalizeBoolean(value, fallback = true) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  }
  return fallback;
}

function sanitizeUserBody(body = {}) {
  const full_name = normalizeString(body.full_name || body.nome);
  const email = normalizeEmail(body.email);
  const gender = normalizeString(body.gender || body.genero);
  const cep = normalizeString(body.cep);
  const tipo_usuario = 'ambos';
  const nome_loja = normalizeString(body.nome_loja);
  const descricao_loja = normalizeString(body.descricao_loja);
  const telefone = normalizeString(body.telefone);
  const receber_email_notificacao_venda = normalizeBoolean(
    body.receber_email_notificacao_venda,
    true,
  );

  return {
    full_name,
    email,
    gender,
    cep,
    tipo_usuario,
    nome_loja,
    descricao_loja,
    telefone,
    receber_email_notificacao_venda,
  };
}

function sanitizeRegisterBody(body = {}) {
  const userBody = sanitizeUserBody(body);
  const password = typeof body.password === 'string' ? body.password : '';

  return { ...userBody, password };
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isIntegerId(value) {
  return /^\d+$/.test(String(value));
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value)
  );
}

function isSupabaseEmailConfirmed(user) {
  return Boolean(user?.email_confirmed_at || user?.confirmed_at);
}

function normalizeProfileRole(profile) {
  return profile ? { ...profile, tipo_usuario: 'ambos' } : profile;
}

function buildUserMetadata(userBody) {
  return {
    full_name: userBody.full_name,
    gender: userBody.gender || null,
    cep: userBody.cep || null,
    tipo_usuario: userBody.tipo_usuario || null,
    nome_loja: userBody.nome_loja || null,
    descricao_loja: userBody.descricao_loja || null,
    telefone: userBody.telefone || null,
    receber_email_notificacao_venda: userBody.receber_email_notificacao_venda ?? true,
  };
}

function buildUserPayload(userBody, options = {}) {
  const { includeEmail = true, includeEmailVerification = false } = options;

  const payload = {
    full_name: userBody.full_name,
    gender: userBody.gender || null,
    cep: userBody.cep || null,
    tipo_usuario: userBody.tipo_usuario || null,
    nome_loja: userBody.nome_loja || null,
    descricao_loja: userBody.descricao_loja || null,
    telefone: userBody.telefone || null,
    receber_email_notificacao_venda: userBody.receber_email_notificacao_venda ?? true,
    updated_at: new Date().toISOString(),
  };

  if (includeEmail) {
    payload.email = userBody.email;
  }

  if (includeEmailVerification) {
    payload.email_verificado = Boolean(userBody.email_verificado);
  }

  return payload;
}

function buildFallbackProfileFromAuthUser(user) {
  const metadata = user?.user_metadata || {};

  return {
    full_name: metadata.full_name || '',
    email: user?.email || '',
    gender: metadata.gender || '',
    cep: metadata.cep || '',
    tipo_usuario: 'ambos',
    nome_loja: metadata.nome_loja || '',
    descricao_loja: metadata.descricao_loja || '',
    telefone: metadata.telefone || '',
    receber_email_notificacao_venda: metadata.receber_email_notificacao_venda !== false,
    email_verificado: isSupabaseEmailConfirmed(user),
  };
}

async function findUserProfileByEmail(email) {
  const { data, error } = await supabaseAdmin
    .from(USER_TABLE)
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return normalizeProfileRole(data);
}

async function syncProfileEmailVerification(profile, authUser) {
  if (!profile || !isSupabaseEmailConfirmed(authUser) || profile.email_verificado === true) {
    return profile;
  }

  const { data, error } = await supabaseAdmin
    .from(USER_TABLE)
    .update({
      email_verificado: true,
      updated_at: new Date().toISOString(),
    })
    .eq('email', profile.email)
    .select('*')
    .maybeSingle();

  if (error) {
    throw error;
  }

  return normalizeProfileRole(data) || {
    ...profile,
    tipo_usuario: 'ambos',
    email_verificado: true,
  };
}

async function findUserProfileById(id) {
  const { data, error } = await supabaseAdmin
    .from(USER_TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return normalizeProfileRole(data);
}

async function saveUserProfile(userBody, options = {}) {
  const { forceEmailVerificadoOnInsert = false } = options;

  const existingProfile = await findUserProfileByEmail(userBody.email);

  const payload = buildUserPayload(userBody, {
    includeEmail: !existingProfile,
    includeEmailVerification: !existingProfile,
  });

  if (existingProfile) {
    const { data, error } = await supabaseAdmin
      .from(USER_TABLE)
      .update(payload)
      .eq('email', userBody.email)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  const { data, error } = await supabaseAdmin
    .from(USER_TABLE)
    .insert({
      ...payload,
      email: userBody.email,
      email_verificado: forceEmailVerificadoOnInsert ? true : Boolean(userBody.email_verificado),
      created_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function updateAuthMetadata(authUserId, userBody) {
  if (!authUserId) {
    return null;
  }

  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
    user_metadata: buildUserMetadata(userBody),
  });

  if (error) {
    throw error;
  }

  return data?.user || null;
}

router.get('/health', (req, res) => {
  return res.json({
    status: 'ok',
    message: 'API de autenticação do BigPeças funcionando com Supabase.',
  });
});

router.post('/register', async (req, res, next) => {
  try {
    const userBody = sanitizeRegisterBody(req.body);

    if (!supabasePublic) {
      return next(new AppError(503, 'Configure SUPABASE_ANON_KEY no microserviço de autenticação.'));
    }

    if (!userBody.full_name) {
      return next(new AppError(400, 'Informe o nome completo.'));
    }

    if (!userBody.email || !validateEmail(userBody.email)) {
      return next(new AppError(400, 'Informe um email válido.'));
    }

    if (!userBody.password || userBody.password.length < 8) {
      return next(new AppError(400, 'A senha deve ter pelo menos 8 caracteres.'));
    }

    const existingProfile = await findUserProfileByEmail(userBody.email);

    if (existingProfile) {
      return next(new AppError(409, 'Este email já está cadastrado.'));
    }

    const { data: signUpData, error: signUpError } = await supabasePublic.auth.signUp({
      email: userBody.email,
      password: userBody.password,
      options: {
        data: buildUserMetadata(userBody),
        emailRedirectTo: getEmailConfirmRedirectTo(),
      },
    });

    if (signUpError) {
      throw signUpError;
    }

    const authUser = signUpData?.user;

    if (!authUser?.id) {
      return next(new AppError(500, 'Não foi possível criar o usuário no Supabase.'));
    }

    const profile = await saveUserProfile(
      {
        ...userBody,
        email_verificado: isSupabaseEmailConfirmed(authUser),
      },
      {
        forceEmailVerificadoOnInsert: isSupabaseEmailConfirmed(authUser),
      }
    );

    return res.status(201).json({
      message: 'Conta criada. Verifique seu email para confirmar o cadastro.',
      emailVerificationRequiredForSelling: true,
      authUser: {
        id: authUser.id,
        email: authUser.email,
      },
      profile,
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/me', verifyToken, async (req, res, next) => {
  try {
    const email = normalizeEmail(req.user.email);
    let profile = email ? await findUserProfileByEmail(email) : null;

    if (profile) {
      profile = await syncProfileEmailVerification(profile, req.user);
    }

    return res.json({
      message: 'Token validado com sucesso no backend.',
      user: {
        id: req.user.id,
        email: req.user.email || null,
        profile: profile || buildFallbackProfileFromAuthUser(req.user),
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/users/:id', verifyToken, async (req, res, next) => {
  try {
    const id = normalizeString(req.params.id);

    if (!id) {
      return next(new AppError(400, 'Informe o id do usuário.'));
    }

    if (!isIntegerId(id) && !isUuid(id)) {
      return next(new AppError(400, 'Informe um id de usuário válido.'));
    }

    if (isIntegerId(id)) {
      const profile = await findUserProfileById(Number(id));

      if (!profile) {
        return next(new AppError(404, 'Usuário não encontrado.'));
      }

      return res.json({
        user: {
          id: profile.id,
          email: profile.email || null,
          profile,
        },
      });
    }

    const { data, error } = await supabaseAdmin.auth.admin.getUserById(id);

    if (error || !data?.user) {
      return next(new AppError(404, 'Usuário não encontrado.'));
    }

    const email = normalizeEmail(data.user.email);
    const profile = email ? await findUserProfileByEmail(email) : null;

    return res.json({
      user: {
        id: data.user.id,
        email: data.user.email || null,
        profile: profile || buildFallbackProfileFromAuthUser(data.user),
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/profile', verifyToken, async (req, res, next) => {
  try {
    const body = sanitizeUserBody(req.body);
    const email = normalizeEmail(req.user.email);

    if (!email || !validateEmail(email)) {
      return next(new AppError(400, 'Não foi possível identificar o email do usuário autenticado.'));
    }

    const userBody = {
      ...body,
      email,
      full_name: body.full_name,
    };

    if (!userBody.full_name) {
      return next(new AppError(400, 'Informe o nome completo.'));
    }

    const existingProfile = await findUserProfileByEmail(email);

    let profile = await saveUserProfile(userBody, {
      forceEmailVerificadoOnInsert: isSupabaseEmailConfirmed(req.user),
    });

    await updateAuthMetadata(req.user.id, userBody);

    profile = await syncProfileEmailVerification(profile, req.user);

    return res.status(existingProfile ? 200 : 201).json({
      message: existingProfile ? 'Perfil atualizado com sucesso.' : 'Perfil salvo com sucesso.',
      profile,
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/profile', verifyToken, async (req, res, next) => {
  try {
    const email = normalizeEmail(req.user.email);

    if (!email) {
      return next(new AppError(400, 'Não foi possível identificar o email do usuário autenticado.'));
    }

    let profile = await findUserProfileByEmail(email);

    if (!profile) {
      return res.json(buildFallbackProfileFromAuthUser(req.user));
    }

    profile = await syncProfileEmailVerification(profile, req.user);

    return res.json(profile);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
