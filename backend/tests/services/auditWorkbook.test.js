const ExcelJS = require('exceljs');
const createAuditWorkbook = require('../../src/services/auditWorkbook');

describe('auditWorkbook', () => {
  it('gera um xlsx valido, filtravel e com os dados do log', async () => {
    const buffer = await createAuditWorkbook([{
      created_at: '2026-10-25T15:30:00.000Z', actor_name: 'Maria Silva', actor_email: 'maria@example.com',
      functionality_key: 'pedidos', event_type: 'database', action: 'PATCH /:id/status',
      page_path: '/pedidos/10', http_method: 'PATCH', endpoint: '/api/pedidos/10/status',
      status_code: 200, success: true, metadata: { pedido: { id: 10, itens: [{ peca_id: 7 }] } },
    }]);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.getWorksheet('Auditoria');
    expect(sheet.getRow(1).values.slice(1)).toEqual([
      'Data/Hora', 'Usuário', 'E-mail', 'Funcionalidade', 'Tipo', 'Ação',
      'Página', 'Método', 'Endpoint', 'Status', 'Resultado', 'Detalhes',
    ]);
    expect(sheet.getCell('B2').value).toBe('Maria Silva');
    expect(sheet.getCell('K2').value).toBe('Sucesso');
    expect(sheet.getCell('L2').value).toContain('"peca_id": 7');
    expect(sheet.autoFilter).toBe('A1:L1');
  });
});
