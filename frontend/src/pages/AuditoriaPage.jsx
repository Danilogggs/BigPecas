import { Fragment, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import auditGateway from '../features/auditoria/infrastructure/auditGateway';
import './AuditoriaPage.css';
import './AuditoriaDetails.css';

const TYPE_LABEL = { navigation: 'Navegação', database: 'Banco de dados', backend: 'Backend' };
const DATE_TIME_OPTIONS = { dateStyle: 'short', timeStyle: 'medium' };
const PERIODS = [7, 30, 90];

function PeriodOptions({ t }) {
  return PERIODS.map((period) => <option key={period} value={period}>{t('lastNDays', { count: period })}</option>);
}

export default function AuditoriaPage() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { t, formatDate, formatNumber } = useLanguage();
  const [functionalities, setFunctionalities] = useState([]);
  const [logs, setLogs] = useState([]);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportModal, setExportModal] = useState(false);
  const [selectedFunctionality, setSelectedFunctionality] = useState('');
  const [exportDays, setExportDays] = useState(7);
  const [notice, setNotice] = useState(null);
  const [expandedLog, setExpandedLog] = useState(null);

  // Os nomes das funcionalidades vem do banco em portugues; sao traduzidos
  // pelo proprio texto (chave) e, se desconhecidos, exibidos como estao.
  const functionalityLabel = (key) => {
    const item = functionalities.find((entry) => entry.key === key);
    return item ? t(item.label) : key;
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const [config, history] = await Promise.all([
        auditGateway.listFunctionalities(token), auditGateway.listLogs(token, days),
      ]);
      setFunctionalities(config.data || []);
      setLogs(history.data || []);
    } catch (error) { setNotice({ type: 'error', text: error.message }); }
    finally { setLoading(false); }
  }, [days, getToken]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    setSaving(true);
    try {
      const result = await auditGateway.saveFunctionalities(await getToken(), functionalities);
      setFunctionalities(result.data || functionalities);
      setNotice({ type: 'success', text: 'Configuração de auditoria salva.' });
    } catch (error) { setNotice({ type: 'error', text: error.message }); }
    finally { setSaving(false); }
  }

  async function exportExcel(functionality = '', period = days) {
    setExporting(true);
    try {
      const blob = await auditGateway.exportLogs(await getToken(), period, functionality);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `auditoria-${functionality || 'total'}-${period}-dias.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setExportModal(false);
      setNotice({ type: 'success', text: functionality ? 'Planilha da tela selecionada gerada com sucesso.' : 'Planilha total de auditoria gerada com sucesso.' });
    } catch (error) { setNotice({ type: 'error', text: error.message }); }
    finally { setExporting(false); }
  }

  const resultLabel = (log) => {
    const base = t(log.success ? 'Sucesso' : 'Falha');
    return log.status_code ? `${base} · ${log.status_code}` : base;
  };

  return <div className="audit-page">
    <Header />
    <main className="audit-main">
      <button className="audit-back" onClick={() => navigate('/admin')}>← {t('Voltar ao painel administrativo')}</button>
      <header className="audit-heading">
        <div><span>{t('CONTROLE E RASTREABILIDADE')}</span><h1>{t('Auditoria')}</h1><p>{t('Escolha quais áreas geram registros e consulte as interações relevantes dos usuários.')}</p></div>
        <div className="audit-export-actions"><button className="audit-export audit-export-secondary" onClick={() => exportExcel()} disabled={exporting || loading}>{exporting && !exportModal ? t('generating') : `⇩ ${t('Exportação Total')}`}</button><button className="audit-export" onClick={() => { setSelectedFunctionality(''); setExportDays(days); setExportModal(true); }} disabled={exporting || loading}>⇩ {t('Exportação Única')}</button></div>
      </header>

      {notice && <div className={`audit-notice is-${notice.type}`}>{t(notice.text)}<button aria-label={t('Fechar')} onClick={() => setNotice(null)}>×</button></div>}

      <section className="audit-card audit-config">
        <div className="audit-card-heading"><div><h2>{t('Funcionalidades monitoradas')}</h2><p>{t('Somente áreas ativas registrarão navegação, gravações no banco e funções do backend.')}</p></div><strong>{t('activeCount', { count: formatNumber(functionalities.filter((item) => item.enabled).length) })}</strong></div>
        {loading ? <div className="audit-loading">{t('Carregando configurações…')}</div> : <div className="audit-grid">{functionalities.map((item) => <label key={item.key} className={item.enabled ? 'is-enabled' : ''}>
          <span><b>{t(item.label)}</b><small>{t(item.enabled ? 'Registro ativo' : 'Registro desativado')}</small></span>
          <input type="checkbox" aria-label={t(item.label)} checked={item.enabled} onChange={() => setFunctionalities((current) => current.map((entry) => entry.key === item.key ? { ...entry, enabled: !entry.enabled } : entry))} />
          <i aria-hidden="true" />
        </label>)}</div>}
        <footer><span>{t('Alterações passam a valer imediatamente após salvar.')}</span><button onClick={save} disabled={saving || loading}>{saving ? t('Salvando…') : t('Salvar configuração')}</button></footer>
      </section>

      <section className="audit-card audit-history">
        <div className="audit-card-heading"><div><h2>{t('Histórico de interações')}</h2><p>{t('Eventos de navegação, persistência e processamento do backend.')}</p></div><select aria-label={t('period')} value={days} onChange={(event) => setDays(Number(event.target.value))}><PeriodOptions t={t} /></select></div>
        {loading ? <div className="audit-loading">{t('Carregando registros…')}</div> : logs.length === 0 ? <div className="audit-empty">{t('Nenhum registro encontrado neste período.')}</div> : <div className="audit-table-wrap"><table><thead><tr><th>{t('Data/Hora')}</th><th>{t('Usuário')}</th><th>{t('Funcionalidade')}</th><th>{t('Tipo')}</th><th>{t('Ação')}</th><th>{t('Origem')}</th><th>{t('Resultado')}</th><th>{t('Detalhes')}</th></tr></thead><tbody>{logs.map((log) => <Fragment key={log.id}><tr><td>{formatDate(log.created_at, DATE_TIME_OPTIONS)}</td><td><b>{log.actor_name || t('Usuário')}</b><small>{log.actor_email || '—'}</small></td><td>{functionalityLabel(log.functionality_key)}</td><td><span className={`audit-type is-${log.event_type}`}>{TYPE_LABEL[log.event_type] ? t(TYPE_LABEL[log.event_type]) : log.event_type}</span></td><td>{log.action}<small>{log.page_path || ''}</small></td><td><b>{log.http_method || '—'}</b><small>{log.endpoint || t('Navegação interna')}</small></td><td><span className={log.success ? 'audit-success' : 'audit-failure'}>{resultLabel(log)}</span></td><td><button className="audit-details-button" onClick={() => setExpandedLog((current) => current === log.id ? null : log.id)}>{t(expandedLog === log.id ? 'Ocultar' : 'Ver dados')}</button></td></tr>{expandedLog === log.id && <tr className="audit-details-row"><td colSpan="8"><div><strong>{t('Dados completos do evento')}</strong><pre>{JSON.stringify(log.metadata || {}, null, 2)}</pre></div></td></tr>}</Fragment>)}</tbody></table></div>}
      </section>
    </main>
    {exportModal && <div className="audit-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setExportModal(false)}><section className="audit-export-modal" role="dialog" aria-modal="true" aria-labelledby="audit-export-title">
      <button className="audit-modal-close" onClick={() => setExportModal(false)} aria-label={t('Fechar')}>×</button>
      <span className="audit-modal-icon">⇩</span>
      <span className="audit-modal-eyebrow">{t('EXPORTAÇÃO ÚNICA')}</span>
      <h2 id="audit-export-title">{t('Escolha uma tela')}</h2>
      <p>{t('A planilha conterá somente os registros da tela e do período escolhidos.')}</p>
      <label>{t('Tela do sistema')}<select value={selectedFunctionality} onChange={(event) => setSelectedFunctionality(event.target.value)} autoFocus><option value="">{t('Selecione uma tela…')}</option>{functionalities.map((item) => <option key={item.key} value={item.key}>{t(item.label)}</option>)}</select></label>
      <label className="audit-modal-period" style={{ marginTop: 14 }}>{t('Período da exportação')}<select value={exportDays} onChange={(event) => setExportDays(Number(event.target.value))}><PeriodOptions t={t} /></select></label>
      <footer><button onClick={() => setExportModal(false)}>{t('Cancelar')}</button><button className="audit-export" disabled={!selectedFunctionality || exporting} onClick={() => exportExcel(selectedFunctionality, exportDays)}>{exporting ? t('generating') : t('Exportar tela selecionada')}</button></footer>
    </section></div>}
  </div>;
}
