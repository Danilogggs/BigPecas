const ExcelJS = require('exceljs');
const createSalesWorkbook = require('../../src/services/salesWorkbook');

test('gera planilha de vendas item a item com valores reconhecidos pelo Excel', async () => {
  const buffer = await createSalesWorkbook({ sales: [{
    id: '2026-123456', status: 'pago', paid_at: '2026-10-25T12:00:00Z', buyer: 'Maria', total: 700,
    items: [{ id: 10, name: 'Friso Opala', sku: 'FR-1', quantity: 2, unit_price: 350, total: 700 }],
  }] });
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.getWorksheet('Vendas efetivadas');
  expect(sheet.getCell('B2').value).toBe('2026-123456');
  expect(sheet.getCell('E2').value).toBe('Friso Opala');
  expect(sheet.getCell('I2').value).toBe(700);
  expect(sheet.autoFilter).toBe('A1:J1');
});
