const router = require('express').Router();
const { supabaseAdmin: db } = require('../config/supabaseClient');
const { validarCriterio } = require('../services/reviewValidation');
const { validarId } = require('../modules/pecas/domain/peca');
const wrap = fn => async (req, res, next) => {
  try { const { data, error } = await fn(req); if (error) throw error; res.json(data); } catch (e) { next(e); }
};
router.get('/checklist-criterios', wrap(() => db.from('checklist_validacao_peca').select('*').order('ordem').order('id')));
router.post('/checklist-criterios', wrap(req => db.from('checklist_validacao_peca').insert(validarCriterio(req.body)).select('*').single()));
router.put('/checklist-criterios/:id', wrap(req => db.from('checklist_validacao_peca').update(validarCriterio(req.body))
  .eq('id', validarId(req.params.id)).select('*').single()));
// Desativar preserva referências e histórico.
router.delete('/checklist-criterios/:id', wrap(req => db.from('checklist_validacao_peca').update({ ativo: false })
  .eq('id', validarId(req.params.id)).select('*').single()));
module.exports = router;

