const express = require('express');
const adaptar = require('../http/adaptarController');
const AppError = require('../utils/AppError');
const auditService = require('../services/auditService');

const router = express.Router();

router.post('/eventos', adaptar(async (req, res) => {
  const functionality = String(req.body?.functionality || '');
  const action = String(req.body?.action || '');
  if (!functionality || !action) throw new AppError(400, 'Evento de auditoria inválido.');
  const recorded = await auditService.record({
    functionality_key: functionality,
    event_type: 'navigation',
    action,
    page_path: String(req.body?.page_path || '').slice(0, 500) || null,
    success: true,
    user: req.user,
    metadata: { from_path: String(req.body?.from_path || '').slice(0, 500) || null },
  });
  res.status(201).json({ recorded });
}));

module.exports = router;
