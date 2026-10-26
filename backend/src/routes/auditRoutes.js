const express = require('express');
const adaptar = require('../http/adaptarController');
const AppError = require('../utils/AppError');
const auditService = require('../services/auditService');
const createAuditWorkbook = require('../services/auditWorkbook');
const { supabaseAdmin } = require('../config/supabaseClient');

const router = express.Router();
const PERIODS = new Set([7, 30, 90]);

function daysFrom(value) {
  const days = Number(value || 7);
  if (!PERIODS.has(days)) throw new AppError(400, 'Use um período de 7, 30 ou 90 dias.');
  return days;
}

function since(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

async function listLogs(days, limit = 200, functionality = '') {
  let query = supabaseAdmin.from(auditService.LOGS_TABLE)
    .select('id, functionality_key, event_type, action, page_path, http_method, endpoint, status_code, success, actor_email, actor_name, metadata, created_at')
    .gte('created_at', since(days));
  if (functionality) query = query.eq('functionality_key', functionality);
  const { data, error } = await query.order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return data || [];
}

async function validateFunctionality(key) {
  if (!key) return null;
  const { data, error } = await supabaseAdmin.from(auditService.FUNCTIONALITIES_TABLE)
    .select('key, label').eq('key', key).maybeSingle();
  if (error) throw error;
  if (!data) throw new AppError(400, 'A tela selecionada para exportação não existe.');
  return data;
}

router.get('/funcionalidades', adaptar(async (_req, res) => {
  const { data, error } = await supabaseAdmin.from(auditService.FUNCTIONALITIES_TABLE)
    .select('key, label, enabled, updated_at').order('label');
  if (error) throw error;
  res.json({ data: data || [] });
}));

router.put('/funcionalidades', adaptar(async (req, res) => {
  if (!Array.isArray(req.body?.functionalities)) throw new AppError(400, 'Informe as funcionalidades da auditoria.');
  const updates = req.body.functionalities.map((item) => ({
    key: String(item.key || ''),
    label: String(item.label || '').trim(),
    enabled: Boolean(item.enabled),
    updated_at: new Date().toISOString(),
    updated_by: req.admin.id,
  }));
  if (updates.some((item) => !item.key || !item.label)) throw new AppError(400, 'Configuração de auditoria inválida.');
  const { data, error } = await supabaseAdmin.from(auditService.FUNCTIONALITIES_TABLE)
    .upsert(updates, { onConflict: 'key' }).select('key, label, enabled, updated_at');
  if (error) throw error;
  res.json({ message: 'Configuração de auditoria salva.', data: data || [] });
}));

router.get('/logs', adaptar(async (req, res) => {
  const days = daysFrom(req.query.days);
  res.json({ data: await listLogs(days), days });
}));

router.get('/exportar', adaptar(async (req, res) => {
  const days = daysFrom(req.query.days);
  const functionality = await validateFunctionality(String(req.query.functionality || '').trim());
  const logs = await listLogs(days, 100000, functionality?.key);
  const buffer = await createAuditWorkbook(logs);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  const scope = functionality?.key || 'total';
  res.setHeader('Content-Disposition', `attachment; filename="auditoria-${scope}-${days}-dias.xlsx"`);
  res.send(Buffer.from(buffer));
}));

module.exports = router;
