const express = require('express');
const admin = require('../config/firebaseAdmin');
const verifyToken = require('../middlewares/verifyToken');
const AppError = require('../utils/AppError');

const router = express.Router();
const db = admin.firestore();

function sanitizeProfileBody(body = {}) {
  const nome = typeof body.nome === 'string' ? body.nome.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const genero = typeof body.genero === 'string' ? body.genero.trim() : '';
  const cep = typeof body.cep === 'string' ? body.cep.trim() : '';

  return { nome, email, genero, cep };
}

router.get('/health', (req, res) => {
  return res.json({ status: 'ok', message: 'API do BigPeças funcionando.' });
});

router.get('/me', verifyToken, async (req, res, next) => {
  try {
    const profileRef = db.collection('users').doc(req.user.uid);
    const profileSnap = await profileRef.get();

    return res.json({
      message: 'Token validado com sucesso no backend.',
      user: {
        uid: req.user.uid,
        email: req.user.email || null,
        profile: profileSnap.exists ? profileSnap.data() : null,
      }
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/profile', verifyToken, async (req, res, next) => {
  try {
    const { nome, email, genero, cep } = sanitizeProfileBody(req.body);

    if (!nome) {
      return next(new AppError(400, 'Informe o nome completo.'));
    }

    const emailPerfil = email || req.user.email || '';

    if (!emailPerfil) {
      return next(new AppError(400, 'Informe um email válido.'));
    }

    const profileData = {
      uid: req.user.uid,
      nome,
      email: emailPerfil,
      genero,
      cep,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const profileRef = db.collection('users').doc(req.user.uid);
    const profileSnap = await profileRef.get();

    await profileRef.set(
      {
        ...profileData,
        ...(profileSnap.exists
          ? {}
          : { createdAt: admin.firestore.FieldValue.serverTimestamp() }),
      },
      { merge: true }
    );

    return res.status(profileSnap.exists ? 200 : 201).json({
      message: profileSnap.exists
        ? 'Perfil atualizado com sucesso.'
        : 'Perfil salvo com sucesso.',
      profile: {
        ...profileData,
        createdAt: profileSnap.exists ? profileSnap.data()?.createdAt || null : null,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/profile', verifyToken, async (req, res, next) => {
  try {
    const profileRef = db.collection('users').doc(req.user.uid);
    const profileSnap = await profileRef.get();

    if (!profileSnap.exists) {
      return next(new AppError(404, 'Não encontramos os dados do seu perfil.'));
    }

    return res.json(profileSnap.data());
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
