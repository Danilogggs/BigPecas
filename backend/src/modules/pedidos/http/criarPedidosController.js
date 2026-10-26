const adaptar = require('../../../http/adaptarController');
const createSalesWorkbook = require('../../../services/salesWorkbook');

function criarPedidosController(useCases) {
  return Object.freeze({
    historico: adaptar(async (req, res) => {
      res.json(await useCases.obterHistorico(req.user));
    }),

    relatorioVendas: adaptar(async (req, res) => {
      res.json(await useCases.obterRelatorioVendas(req.user, req.query.days));
    }),

    exportarRelatorioVendas: adaptar(async (req, res) => {
      const report = await useCases.obterRelatorioVendas(req.user, req.query.days);
      const buffer = await createSalesWorkbook(report);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="vendas-efetivadas-${report.days}-dias.xlsx"`);
      res.send(Buffer.from(buffer));
    }),

    listar: adaptar(async (req, res) => {
      res.json(await useCases.listarCompras(req.user));
    }),

    detalhar: adaptar(async (req, res) => {
      res.json(await useCases.obterPedido({
        identidade: req.user,
        id: req.params.id,
        visao: req.query.visao,
      }));
    }),

    criar: adaptar(async (req, res) => {
      const pedido = await useCases.criarPedido({ identidade: req.user, dados: req.body });
      res.status(201).json(pedido);
    }),

    atualizarStatus: adaptar(async (req, res) => {
      res.json(await useCases.atualizarStatus({
        identidade: req.user,
        id: req.params.id,
        status: req.body.status,
      }));
    }),
  });
}

module.exports = criarPedidosController;
