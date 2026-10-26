async function createAuditWorkbook(logs) {
  const ExcelJS = require('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'BigPeças';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('Auditoria', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = [
    { header: 'Data/Hora', key: 'created_at', width: 23 },
    { header: 'Usuário', key: 'actor_name', width: 28 },
    { header: 'E-mail', key: 'actor_email', width: 32 },
    { header: 'Funcionalidade', key: 'functionality_key', width: 24 },
    { header: 'Tipo', key: 'event_type', width: 16 },
    { header: 'Ação', key: 'action', width: 38 },
    { header: 'Página', key: 'page_path', width: 32 },
    { header: 'Método', key: 'http_method', width: 12 },
    { header: 'Endpoint', key: 'endpoint', width: 38 },
    { header: 'Status', key: 'status_code', width: 12 },
    { header: 'Resultado', key: 'success', width: 14 },
    { header: 'Detalhes', key: 'details', width: 80 },
  ];
  logs.forEach((log) => sheet.addRow({
    ...log,
    created_at: new Date(log.created_at),
    success: log.success ? 'Sucesso' : 'Falha',
    details: JSON.stringify(log.metadata || {}, null, 2).slice(0, 32000),
  }));
  sheet.getColumn('created_at').numFmt = 'dd/mm/yyyy hh:mm:ss';
  sheet.autoFilter = { from: 'A1', to: 'L1' };
  sheet.getColumn('details').alignment = { vertical: 'top', wrapText: true };
  sheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F5C35' } };
    cell.alignment = { vertical: 'middle' };
  });
  sheet.getRow(1).height = 24;
  return workbook.xlsx.writeBuffer();
}

module.exports = createAuditWorkbook;
