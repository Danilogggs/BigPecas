const router = require('express').Router();
const service = require('../services/avaliadorService');
const { verifyAvaliador } = require('../middlewares/verifyAvaliador');
const { validarId } = require('../modules/pecas/domain/peca');
const wrap = fn => async (req, res, next) => { try { res.json(await fn(req)); } catch (e) { next(e); } };
router.use(verifyAvaliador);
router.get('/pecas-pendentes', wrap(req => service.getPecasPendentes(req.avaliador.id, req.query.limit, req.query.offset)));
router.get('/estatisticas', wrap(req => service.getEstatisticas(req.avaliador.id)));
router.get('/checklist-criterios', wrap(() => service.getChecklistCriterios()));
router.get('/validacao/:pecaId', wrap(req => service.getValidacaoPeca(validarId(req.params.pecaId))));
for (const rejeitar of [false, true]) {
  router.post('/validacao/:pecaId' + (rejeitar ? '/rejeitar' : ''), wrap(req => service.decidir(
    validarId(req.params.pecaId), req.avaliador.id, req.body.respostas,
    (rejeitar ? req.body.motivo : req.body.comentarios) || '', req.body.revisao, rejeitar,
  )));
}
module.exports = router;

