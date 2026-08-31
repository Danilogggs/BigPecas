const router = require('express').Router();
const service = require('../services/currencyService');
const wrap = fn => async (req, res, next) => { try { res.json(await fn(req)); } catch (e) { next(e); } };
router.get('/config', wrap(() => service.config()));
router.get('/peca/:pecaId/faixas-preco', wrap(req => service.getPecaPriceRanges(req.params.pecaId)));
router.get('/categorias', wrap(req => service.categories(req.query.moeda)));
router.get('/categorias/populares', wrap(req => service.categories(req.query.moeda)));
router.get('/filtrar-por-faixa', wrap(req => service.filterByPriceRange(req.query.priceMin, req.query.priceMax, req.query.moeda, req.query.limit, req.query.offset)));
router.post('/converter', wrap(async req => ({ original: { value: req.body.price, currency: req.body.fromCurrency || 'BRL' },
  converted: { value: await service.convert(req.body.price, req.body.fromCurrency || 'BRL', req.body.toCurrency || 'USD'), currency: req.body.toCurrency || 'USD' } })));
module.exports = router;

