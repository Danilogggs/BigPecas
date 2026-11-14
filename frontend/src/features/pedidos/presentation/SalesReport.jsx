import { useEffect, useState } from 'react';
import { exportarRelatorioVendas, obterRelatorioVendas } from '../../../services/pedidosService';
import { useBrlMoney } from '../../../contexts/CurrencyContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { obterMetaStatus } from './pedidoPresentation';
import './SalesReport.css';

const DATE_OPTIONS = { dateStyle: 'short', timeStyle: 'short' };
const PERIODS = [7, 30, 90];

export default function SalesReport() {
  const { t, formatDate, formatNumber } = useLanguage();
  const formatMoney = useBrlMoney();
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
    <header>
      <div><span>{t('salesReportEyebrow')}</span><h2>{t('salesReportTitle')}</h2><p>{t('salesReportDescription')}</p></div>
      <div className="sales-report-actions">
        <select aria-label={t('period')} value={days} onChange={(event) => setDays(Number(event.target.value))}>
          {PERIODS.map((period) => <option key={period} value={period}>{t('lastNDays', { count: period })}</option>)}
        </select>
        <button onClick={exportExcel} disabled={loading || exporting}>{exporting ? t('generating') : `⇩ ${t('exportExcel')}`}</button>
      </div>
    </header>
    {error && <div className="sales-report-error" role="alert">{t(error)}</div>}
    <div className="sales-report-summary">
      <article><span>{t('paidOrders')}</span><strong>{formatNumber(report.summary.orders)}</strong></article>
      <article><span>{t('unitsSold')}</span><strong>{formatNumber(report.summary.units)}</strong></article>
      <article><span>{t('soldValue')}</span><strong>{formatMoney(report.summary.revenue)}</strong></article>
    </div>
    {loading ? <div className="sales-report-empty">{t('loadingReport')}</div>
      : report.sales.length === 0 ? <div className="sales-report-empty">{t('noPaidSalesInPeriod')}</div>
        : <div className="sales-report-table"><table>
          <thead><tr><th>{t('payment')}</th><th>{t('order')}</th><th>{t('buyer')}</th><th>{t('items')}</th><th>{t('units')}</th><th>{t('amount')}</th><th>{t('status')}</th></tr></thead>
          <tbody>{report.sales.map((sale) => <tr key={sale.id}>
            <td>{formatDate(sale.paid_at, DATE_OPTIONS)}</td>
            <td><strong>#{sale.id}</strong></td>
            <td>{sale.buyer}</td>
            <td>{sale.items.map((item) => <span className="sales-report-item" key={item.id}>{item.name}<small>{item.sku || t('noSku')} · {formatNumber(item.quantity)} × {formatMoney(item.unit_price)}</small></span>)}</td>
            <td>{formatNumber(sale.items.reduce((sum, item) => sum + item.quantity, 0))}</td>
            <td><strong>{formatMoney(sale.total)}</strong></td>
            <td><span className={`sales-report-status is-${sale.status}`}>{obterMetaStatus(sale.status, t).label}</span></td>
          </tr>)}</tbody>
        </table></div>}
  </section>;
}
