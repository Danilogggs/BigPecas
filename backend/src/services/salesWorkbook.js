async function createSalesWorkbook(report) {
  const ExcelJS = require('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'BigPeças';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('Vendas efetivadas', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = [
    { header: 'Data do pagamento', key: 'paid_at', width: 23 },
    { header: 'Pedido', key: 'order_id', width: 20 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Comprador', key: 'buyer', width: 28 },
    { header: 'Peça', key: 'item_name', width: 34 },
    { header: 'SKU', key: 'sku', width: 18 },
    { header: 'Quantidade', key: 'quantity', width: 13 },
    { header: 'Valor unitário', key: 'unit_price', width: 17 },
    { header: 'Total do item', key: 'item_total', width: 17 },
    { header: 'Total da venda', key: 'sale_total', width: 17 },
  ];
  report.sales.forEach((sale) => sale.items.forEach((item) => sheet.addRow({
    paid_at: new Date(sale.paid_at), order_id: sale.id, status: sale.status,
    buyer: sale.buyer, item_name: item.name, sku: item.sku || '',
    quantity: item.quantity, unit_price: item.unit_price, item_total: item.total,
    sale_total: sale.total,
  })));
  sheet.getColumn('paid_at').numFmt = 'dd/mm/yyyy hh:mm:ss';
  ['unit_price', 'item_total', 'sale_total'].forEach((key) => { sheet.getColumn(key).numFmt = 'R$ #,##0.00'; });
  sheet.autoFilter = { from: 'A1', to: 'J1' };
  sheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F5C35' } };
  });
  sheet.getRow(1).height = 24;
  return workbook.xlsx.writeBuffer();
}

module.exports = createSalesWorkbook;
