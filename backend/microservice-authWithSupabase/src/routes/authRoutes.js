const express = require('express');
const crypto = require('crypto');
const { supabaseAdmin, supabasePublic } = require('../config/supabaseClient');
const verifyToken = require('../middlewares/verifyToken');
const AppError = require('../utils/AppError');

const router = express.Router();
const USER_TABLE = process.env.SUPABASE_USER_TABLE || 'users';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const AUTH_API_PUBLIC_URL = process.env.AUTH_API_PUBLIC_URL || 'http://localhost:3001';
const EMAIL_VERIFICATION_SECRET =
  process.env.EMAIL_VERIFICATION_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'dev-email-verification-secret';

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

function isIntegerId(value) {
  return /^\d+$/.test(String(value));
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value)
  );
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
    tipo_usuario: metadata.tipo_usuario || '',
    nome_loja: metadata.nome_loja || '',
    descricao_loja: metadata.descricao_loja || '',
    telefone: metadata.telefone || '',
    email_verificado: false,
  };
}

function base64UrlEncode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function base64UrlDecode(value) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

function signValue(value) {
  return crypto
    .createHmac('sha256', EMAIL_VERIFICATION_SECRET)
    .update(value)
    .digest('base64url');
}

function generateEmailVerificationToken(email) {
  const payload = {
    email,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
  };

  const encodedPayload = base64UrlEncode(payload);
  const signature = signValue(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

function verifyEmailVerificationToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    throw new AppError(400, 'Link de verificação inválido.');
  }

  const [encodedPayload, signature] = token.split('.');

  const expectedSignature = signValue(encodedPayload);

  if (signature !== expectedSignature) {
    throw new AppError(400, 'Link de verificação inválido ou adulterado.');
  }

  const payload = base64UrlDecode(encodedPayload);

  if (!payload?.email || !validateEmail(payload.email)) {
    throw new AppError(400, 'Link de verificação inválido.');
  }

  if (!payload?.exp || Date.now() > payload.exp) {
    throw new AppError(400, 'Link de verificação expirado. Solicite um novo link.');
  }

  return {
    email: normalizeEmail(payload.email),
  };
}

function buildVerificationLink(email) {
  const token = generateEmailVerificationToken(email);
  return `${AUTH_API_PUBLIC_URL}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
}

async function sendVerificationEmail(email, verificationLink) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const from = process.env.VERIFY_EMAIL_FROM || 'BigPeças <onboarding@resend.dev>';

  if (!resendApiKey) {
    console.warn('⚠️ RESEND_API_KEY não configurada. Link de verificação gerado apenas no terminal:');
    console.warn(verificationLink);
    return {
      sent: false,
      reason: 'RESEND_API_KEY não configurada.',
    };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: 'Confirme seu e-mail no BigPeças',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
          <h2 style="color: #7B1D2E;">Confirme seu e-mail no BigPeças</h2>
          <p>Olá!</p>
          <p>Recebemos seu cadastro no BigPeças.</p>
          <p>Para liberar recursos de vendedor, como cadastrar peças, confirme seu e-mail clicando no botão abaixo:</p>
          <p>
            <a
              href="${verificationLink}"
              style="
                display: inline-block;
                padding: 12px 18px;
                background: #7B1D2E;
                color: #fff;
                text-decoration: none;
                border-radius: 8px;
                font-weight: bold;
              "
            >
              Confirmar e-mail
            </a>
          </p>
          <p>Se o botão não funcionar, copie e cole este link no navegador:</p>
          <p style="word-break: break-all;">${verificationLink}</p>
          <p>Este link expira em 7 dias.</p>
        </div>
      `,
    }),
  });

  const responseData = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error('Erro ao enviar e-mail pelo Resend:', responseData);
    throw new AppError(502, 'Não foi possível enviar o e-mail de verificação agora.');
  }

  return {
    sent: true,
    data: responseData,
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

  return data;
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

  return data;
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
      email_verificado: forceEmailVerificadoOnInsert ? true : false,
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
      },
    });

    if (signUpError) {
      throw signUpError;
    }

    const authUser = signUpData?.user;

    if (!authUser?.id) {
      return next(new AppError(500, 'Não foi possível criar o usuário no Supabase.'));
    }

    const profile = await saveUserProfile({
      ...userBody,
      email_verificado: false,
    });

    const verificationLink = buildVerificationLink(userBody.email);
    const emailResult = await sendVerificationEmail(userBody.email, verificationLink);

    return res.status(201).json({
      message: emailResult.sent
        ? 'Conta criada. Enviamos um link de verificação para seu email.'
        : 'Conta criada. Link de verificação gerado no terminal do backend.',
      emailVerificationRequiredForSelling: true,
      authUser: {
        id: authUser.id,
        email: authUser.email,
      },
      profile,
      devVerificationLink: process.env.NODE_ENV === 'production' ? undefined : verificationLink,
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.query;
    const { email } = verifyEmailVerificationToken(token);

    const { data, error } = await supabaseAdmin
      .from(USER_TABLE)
      .update({
        email_verificado: true,
        updated_at: new Date().toISOString(),
      })
      .eq('email', email)
      .select('id, email, email_verificado')
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return next(new AppError(404, 'Usuário não encontrado para verificação.'));
    }

    return res.redirect(`${FRONTEND_URL}/login?emailVerificado=1`);
  } catch (error) {
    return next(error);
  }
});

router.post('/resend-verification', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);

    if (!email || !validateEmail(email)) {
      return next(new AppError(400, 'Informe um email válido.'));
    }

    const profile = await findUserProfileByEmail(email);

    if (!profile) {
      return next(new AppError(404, 'Usuário não encontrado.'));
    }

    if (profile.email_verificado) {
      return res.json({
        message: 'Este e-mail já está verificado.',
      });
    }

    const verificationLink = buildVerificationLink(email);
    const emailResult = await sendVerificationEmail(email, verificationLink);

    return res.json({
      message: emailResult.sent
        ? 'Novo link de verificação enviado para seu email.'
        : 'Novo link de verificação gerado no terminal do backend.',
      devVerificationLink: process.env.NODE_ENV === 'production' ? undefined : verificationLink,
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
      return next(new AppError(400, 'Informe o id do usuÃ¡rio.'));
    }

    if (!isIntegerId(id) && !isUuid(id)) {
      return next(new AppError(400, 'Informe um id de usuÃ¡rio vÃ¡lido.'));
    }

    if (isIntegerId(id)) {
      const profile = await findUserProfileById(Number(id));

      if (!profile) {
        return next(new AppError(404, 'UsuÃ¡rio nÃ£o encontrado.'));
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
      return next(new AppError(404, 'UsuÃ¡rio nÃ£o encontrado.'));
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
    const profile = await saveUserProfile(userBody);
    await updateAuthMetadata(req.user.id, userBody);

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
      return res.json(buildFallbackProfileFromAuthUser(req.user));
    }

    return res.json(profile);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
