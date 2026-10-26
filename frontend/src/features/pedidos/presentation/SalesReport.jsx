import { useEffect, useState } from 'react';
import { exportarRelatorioVendas, obterRelatorioVendas } from '../../../services/pedidosService';
import { formatarMoeda } from './pedidoPresentation';
import './SalesReport.css';

const formatDate = (value) => new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short', timeStyle: 'short',
}).format(new Date(value));

export default function SalesReport() {
  const [days, setDays] = useState(30);
  const [report, setReport] = useState({ sales: [], summary: { orders: 0, units: 0, revenue: 0 } });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    obterRelatorioVendas(days).then((data) => { if (active) setReport(data); })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [days]);

  async function exportExcel() {
    setExporting(true); setError('');
    try {
      const blob = await exportarRelatorioVendas(days);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = `vendas-efetivadas-${days}-dias.xlsx`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
    } catch (err) { setError(err.message); }
    finally { setExporting(false); }
  }

  return <section className="sales-report">
    <header><div><span>RELATÓRIO DO VENDEDOR</span><h2>Vendas efetivadas</h2><p>Pedidos com pagamento confirmado e somente os itens vendidos por você.</p></div><div className="sales-report-actions"><select value={days} onChange={(event) => setDays(Number(event.target.value))}><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option></select><button onClick={exportExcel} disabled={loading || exporting}>{exporting ? 'Gerando…' : '⇩ Exportar Excel'}</button></div></header>
    {error && <div className="sales-report-error" role="alert">{error}</div>}
    <div className="sales-report-summary"><article><span>Pedidos pagos</span><strong>{report.summary.orders}</strong></article><article><span>Unidades vendidas</span><strong>{report.summary.units}</strong></article><article><span>Valor vendido</span><strong>{formatarMoeda(report.summary.revenue)}</strong></article></div>
    {loading ? <div className="sales-report-empty">Carregando relatório…</div> : report.sales.length === 0 ? <div className="sales-report-empty">Nenhuma venda paga neste período.</div> : <div className="sales-report-table"><table><thead><tr><th>Pagamento</th><th>Pedido</th><th>Comprador</th><th>Itens</th><th>Unidades</th><th>Valor</th><th>Status</th></tr></thead><tbody>{report.sales.map((sale) => <tr key={sale.id}><td>{formatDate(sale.paid_at)}</td><td><strong>#{sale.id}</strong></td><td>{sale.buyer}</td><td>{sale.items.map((item) => <span className="sales-report-item" key={item.id}>{item.name}<small>{item.sku || 'Sem SKU'} · {item.quantity} × {formatarMoeda(item.unit_price)}</small></span>)}</td><td>{sale.items.reduce((sum, item) => sum + item.quantity, 0)}</td><td><strong>{formatarMoeda(sale.total)}</strong></td><td><span className={`sales-report-status is-${sale.status}`}>{sale.status}</span></td></tr>)}</tbody></table></div>}
  </section>;
}
