const express = require('express');
const supabase = require('../config/supabaseClient');
const verifyToken = require('../middlewares/verifyToken');
const AppError = require('../utils/AppError');

const router = express.Router();
const USER_TABLE = process.env.SUPABASE_USER_TABLE || 'users';

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeEmail(value) {
  return normalizeString(value).toLowerCase();
}

function sanitizeUserBody(body = {}) {
  const full_name = normalizeString(body.full_name || body.nome);
  const email = normalizeEmail(body.email);
  const gender = normalizeString(body.gender || body.genero);
  const cep = normalizeString(body.cep);
  const tipo_usuario = normalizeString(body.tipo_usuario);
  const nome_loja = normalizeString(body.nome_loja);
  const descricao_loja = normalizeString(body.descricao_loja);
  const telefone = normalizeString(body.telefone);

  return {
    full_name,
    email,
    gender,
    cep,
    tipo_usuario,
    nome_loja,
    descricao_loja,
    telefone,
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

function buildUserPayload(userBody, options = {}) {
  const { includeEmail = true } = options;
  const payload = {
    full_name: userBody.full_name,
    gender: userBody.gender || null,
    cep: userBody.cep || null,
    tipo_usuario: userBody.tipo_usuario || null,
    nome_loja: userBody.nome_loja || null,
    descricao_loja: userBody.descricao_loja || null,
    telefone: userBody.telefone || null,
    updated_at: new Date().toISOString(),
  };

  if (includeEmail) {
    payload.email = userBody.email;
  }

  return payload;
}

async function findUserProfileByEmail(email) {
  const { data, error } = await supabase
    .from(USER_TABLE)
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function saveUserProfile(userBody) {
  const existingProfile = await findUserProfileByEmail(userBody.email);
  const payload = buildUserPayload(userBody, { includeEmail: !existingProfile });

  if (existingProfile) {
    const { data, error } = await supabase
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

  const { data, error } = await supabase
    .from(USER_TABLE)
    .insert({
      ...payload,
      email: userBody.email,
      created_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

router.get('/health', (req, res) => {
  return res.json({ status: 'ok', message: 'API de autenticação do BigPeças funcionando com Supabase.' });
});

router.post('/register', async (req, res, next) => {
  try {
    const userBody = sanitizeRegisterBody(req.body);

    if (!userBody.full_name) {
      return next(new AppError(400, 'Informe o nome completo.'));
    }

    if (!userBody.email || !validateEmail(userBody.email)) {
      return next(new AppError(400, 'Informe um email válido.'));
    }

    if (!userBody.password || userBody.password.length < 8) {
      return next(new AppError(400, 'A senha deve ter pelo menos 8 caracteres.'));
    }

    const { data: createdUserData, error: createUserError } = await supabase.auth.admin.createUser({
      email: userBody.email,
      password: userBody.password,
      email_confirm: true,
      user_metadata: {
        full_name: userBody.full_name,
        gender: userBody.gender,
        cep: userBody.cep,
        tipo_usuario: userBody.tipo_usuario,
        nome_loja: userBody.nome_loja,
        telefone: userBody.telefone,
      },
    });

    if (createUserError) {
      throw createUserError;
    }

    const authUser = createdUserData?.user;

    if (!authUser?.id) {
      return next(new AppError(500, 'Não foi possível criar o usuário no Supabase.'));
    }

    const profile = await saveUserProfile(userBody);

    return res.status(201).json({
      message: 'Conta criada com sucesso.',
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
    const profile = email ? await findUserProfileByEmail(email) : null;

    return res.json({
      message: 'Token validado com sucesso no backend.',
      user: {
        id: req.user.id,
        email: req.user.email || null,
        profile: profile || null,
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
    const profile = await saveUserProfile(userBody);

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

    const profile = await findUserProfileByEmail(email);

    if (!profile) {
      return next(new AppError(404, 'Não encontramos os dados do seu perfil.'));
    }

    return res.json(profile);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
