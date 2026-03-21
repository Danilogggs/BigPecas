const express = require('express');
const verifyToken = require('../middlewares/verifyToken');

const router = express.Router();

router.get('/health', (req, res) => {
  return res.json({ status: 'ok', message: 'API do BigPeças funcionando.' });
});

router.get('/me', verifyToken, (req, res) => {
  return res.json({
    message: 'Token validado com sucesso no backend.',
    user: {
      uid: req.user.uid,
      email: req.user.email || null
    }
  });
});

module.exports = router;
