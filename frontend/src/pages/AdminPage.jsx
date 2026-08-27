import { Fragment, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { SearchIcon, StarIcon, TrashIcon, UserIcon, WrenchIcon } from '../components/Icons';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import useAdminDashboard from '../features/admin/application/useAdminDashboard';
import { WIDGETS_ADMIN, WIDGETS_PADRAO } from '../features/admin/domain/dashboard';
import adminGateway from '../features/admin/infrastructure/adminGateway';
import { createAdminTranslator } from '../features/admin/presentation/adminTranslations';
import './AdminPage.css';
import './AdminDashboardPolish.css';

const NAV = [
  ['overview', 'Visão geral', '▦'], ['usuarios', 'Usuários', 'user'],
  ['pecas', 'Peças', 'part'], ['pedidos', 'Pedidos', '▤'], ['avaliacoes', 'Avaliações', 'star'],
];
const STATUS = ['aguardando_pagamento', 'pago', 'enviado', 'entregue', 'cancelado'];
const STATUS_LABEL = { aguardando_pagamento: 'Aguardando pagamento', pago: 'Pago', enviado: 'Enviado', entregue: 'Entregue', cancelado: 'Cancelado' };
const EMPTY_FORM = { full_name: '', email: '', password: '' };

function Icon({ name, size = 19 }) {
  if (name === 'user') return <UserIcon size={size} />;
  if (name === 'part') return <WrenchIcon size={size} />;
  if (name === 'star') return <StarIcon size={size} />;
  return <span className="admin-nav-symbol">{name}</span>;
}

const date = (value) => value ? new Intl.DateTimeFormat('pt-BR').format(new Date(value)) : '—';
const money = (value) => Number.isFinite(Number(value))
  ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value)) : '—';

export default function AdminPage() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { t, language } = useLanguage();
  const tr = createAdminTranslator(language);
  const adminNav = NAV.map(([id, label, icon]) => [id, tr(label), icon]);
  const translatedStatus = Object.fromEntries(Object.entries(STATUS_LABEL).map(([key, label]) => [key, t({ aguardando_pagamento: 'awaitingPayment', pago: 'paid', enviado: 'shipped', entregue: 'delivered', cancelado: 'canceled' }[key]) || tr(label)]));
  const dash = useAdminDashboard({ getToken, t });
  const [section, setSection] = useState('overview');
  const [records, setRecords] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [reviewType, setReviewType] = useState('produtos');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [notice, setNotice] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState('');
  const [insights, setInsights] = useState({ loading: true, pedidos: [], pecas: [], usuarios: [] });
  const [draggingWidget, setDraggingWidget] = useState('');
  const [periodDays, setPeriodDays] = useState(30);
  const [dashboardStatus, setDashboardStatus] = useState('');
  const [dashboardSupplier, setDashboardSupplier] = useState('');
  const [chartGranularity, setChartGranularity] = useState('semanal');

  async function load(target = section) {
    if (target === 'overview') return;
    setLoadingList(true);
    try {
      const token = await getToken();
      let result;
      if (target === 'usuarios') result = await adminGateway.listarUsuarios(token, search);
      if (target === 'pecas') result = await adminGateway.listarPecas(token, search);
      if (target === 'pedidos') result = await adminGateway.listarPedidos(token, statusFilter);
      if (target === 'avaliacoes') result = await adminGateway.listarAvaliacoes(token, reviewType);
      setRecords(result?.data || []);
    } catch (error) { setRecords([]); setNotice({ type: 'error', text: error.message }); }
    finally { setLoadingList(false); }
  }

  useEffect(() => { setSearch(''); setRecords([]); }, [section]);
  useEffect(() => { load(); }, [section, statusFilter, reviewType]);
  useEffect(() => {
    if (!dash.state.admin) return;
    let active = true;
    (async () => {
      try {
        const token = await getToken();
        const dados = await adminGateway.carregarDadosGerenciais(token);
        if (active) setInsights({ loading: false, pedidos: dados.pedidos || [], pecas: dados.pecas || [], usuarios: dados.usuarios || [] });
      } catch { if (active) setInsights((current) => ({ ...current, loading: false })); }
    })();
    return () => { active = false; };
  }, [dash.state.admin, getToken]);

  async function action(key, callback, message) {
    setBusy(key); setNotice({ type: '', text: '' });
    try { await callback(); setNotice({ type: 'success', text: message }); await load(); return true; }
    catch (error) { setNotice({ type: 'error', text: error.message }); return false; }
    finally { setBusy(''); }
  }

  async function createAdmin(event) {
    event.preventDefault(); setBusy('create');
    try {
      const result = await adminGateway.criarContaAdmin(await getToken(), form);
      dash.registrarAdminCriado(); setForm(EMPTY_FORM); setModal(false);
      setNotice({ type: 'success', text: result.message });
      if (section === 'usuarios') load('usuarios');
    } catch (error) { setNotice({ type: 'error', text: error.message }); }
    finally { setBusy(''); }
  }

  async function saveEdit(event) {
    event.preventDefault();
    const key = `edit-${editing.id}`;
    const saved = await action(key, async () => {
      const token = await getToken();
      if (editing.type === 'usuario') return adminGateway.editarUsuario(token, editing.id, editing.data);
      if (editing.type === 'peca') return adminGateway.editarPeca(token, editing.id, editing.data);
      return adminGateway.editarAvaliacao(token, reviewType, editing.id, editing.data);
    }, 'Registro atualizado com sucesso.');
    if (saved) setEditing(null);
  }

  async function toggleAdmin(item) {
    const nextValue = !item.is_admin;
    setRecords((current) => current.map((record) => record.id === item.id ? { ...record, is_admin: nextValue } : record));
    setBusy(`u${item.id}`);
    try {
      await adminGateway.atualizarAdmin(await getToken(), item.id, nextValue);
      setNotice({ type: 'success', text: 'Permissão atualizada.' });
    } catch (error) {
      setRecords((current) => current.map((record) => record.id === item.id ? { ...record, is_admin: item.is_admin } : record));
      setNotice({ type: 'error', text: error.message });
    } finally { setBusy(''); }
  }

  async function confirmDelete() {
    const target = confirming;
    setConfirming(null);
    const key = `delete-${target.type}-${target.item.id}`;
    setBusy(key);
    try {
      const token = await getToken();
      if (target.type === 'usuario') await adminGateway.removerUsuario(token, target.item.id);
      if (target.type === 'peca') await adminGateway.removerPeca(token, target.item.id);
      if (target.type === 'avaliacao') await adminGateway.removerAvaliacao(token, reviewType, target.item.id);
      setRecords((current) => current.filter((item) => item.id !== target.item.id));
      setInsights((current) => ({ ...current, [`${target.type}s`]: (current[`${target.type}s`] || []).filter((item) => item.id !== target.item.id) }));
      dash.ajustarDashboard({
        usuarios: target.type === 'usuario' ? -1 : 0,
        administradores: target.type === 'usuario' && target.item.is_admin ? -1 : 0,
        pecas: target.type === 'peca' ? -1 : 0,
        avaliacoes: target.type === 'avaliacao' ? -1 : 0,
      });
      setNotice({ type: 'success', text: `${target.type === 'usuario' ? 'Usuário excluído' : target.type === 'peca' ? 'Peça removida' : 'Avaliação removida'}.` });
    } catch (error) { setNotice({ type: 'error', text: error.message }); }
    finally { setBusy(''); }
  }

  if (dash.state.loading) return <div className="admin-page"><Header /><div className="admin-full-state"><div className="admin-spinner" /><p>Preparando seu painel…</p></div></div>;
  if (dash.state.error) return <div className="admin-page"><Header /><div className="admin-full-state"><h1>Acesso não autorizado</h1><p>{dash.state.error}</p><button onClick={() => navigate('/')}>Voltar ao início</button></div></div>;

  const title = adminNav.find(([id]) => id === section)?.[1];
  const descriptions = Object.fromEntries(Object.entries({
    overview: 'Acompanhe os principais números e a atividade da plataforma.',
    usuarios: 'Gerencie acessos, perfis e permissões administrativas.',
    pecas: 'Consulte e modere os anúncios publicados no catálogo.',
    pedidos: 'Acompanhe pedidos e atualize o andamento das transações.',
    avaliacoes: 'Modere as avaliações enviadas pela comunidade.',
  }).map(([key, value]) => [key, tr(value)]));
  const now = new Date();
  const periodStart = periodDays ? new Date(now.getTime() - periodDays * 86400000) : null;
  const previousStart = periodDays ? new Date(now.getTime() - periodDays * 2 * 86400000) : null;
  const matchesSupplier = (pedido) => !dashboardSupplier || (pedido.itens || []).some((item) => String(item.fornecedor_id) === dashboardSupplier);
  const filteredOrders = insights.pedidos.filter((pedido) => (!periodStart || new Date(pedido.criado_em) >= periodStart) && (!dashboardStatus || pedido.status === dashboardStatus) && matchesSupplier(pedido));
  const previousOrders = periodDays ? insights.pedidos.filter((pedido) => { const created = new Date(pedido.criado_em); return created >= previousStart && created < periodStart && (!dashboardStatus || pedido.status === dashboardStatus) && matchesSupplier(pedido); }) : [];
  const revenueOf = (orders) => orders.filter((pedido) => pedido.status !== 'cancelado').reduce((sum, pedido) => sum + Number(pedido.total || 0), 0);
  const revenue = revenueOf(filteredOrders);
  const previousRevenue = revenueOf(previousOrders);
  const percentageChange = (current, previous) => previous ? ((current - previous) / previous) * 100 : current ? 100 : 0;
  const completionRate = filteredOrders.length ? filteredOrders.filter((pedido) => pedido.status === 'entregue').length / filteredOrders.length * 100 : 0;
  const cancellationRate = filteredOrders.length ? filteredOrders.filter((pedido) => pedido.status === 'cancelado').length / filteredOrders.length * 100 : 0;
  const revenueOrders = filteredOrders.filter((pedido) => pedido.status !== 'cancelado');
  const previousRevenueOrders = previousOrders.filter((pedido) => pedido.status !== 'cancelado');
  const previousCompletionRate = previousOrders.length ? previousOrders.filter((pedido) => pedido.status === 'entregue').length / previousOrders.length * 100 : 0;
  const managerialValues = { faturamento: revenue, pedidos: filteredOrders.length, ticket_medio: revenueOrders.length ? revenue / revenueOrders.length : 0, taxa_conclusao: completionRate, taxa_cancelamento: cancellationRate };
  const previousManagerialValues = { faturamento: previousRevenue, pedidos: previousOrders.length, ticket_medio: previousRevenueOrders.length ? previousRevenue / previousRevenueOrders.length : 0, taxa_conclusao: previousCompletionRate };
  const suppliers = [...new Map(insights.pedidos.flatMap((pedido) => pedido.itens || []).filter((item) => item.fornecedor_id).map((item) => [String(item.fornecedor_id), item.fornecedor_nome || `Fornecedor #${item.fornecedor_id}`])).entries()];
  const productRanking = Object.values(filteredOrders.flatMap((pedido) => pedido.itens || []).reduce((acc, item) => { const key = String(item.id); if (!acc[key]) acc[key] = { id: key, name: item.nome || item.nome_peca || `Peça #${key}`, units: 0, revenue: 0 }; acc[key].units += Number(item.quantidade || 1); acc[key].revenue += Number(item.preco || 0) * Number(item.quantidade || 1); return acc; }, {})).sort((a, b) => b.units - a.units).slice(0, 5);
  const chartConfig = chartGranularity === 'diario' ? { size: 1, count: Math.min(periodDays || 14, 14) } : chartGranularity === 'mensal' ? { size: 30, count: Math.min(12, Math.max(1, Math.ceil((periodDays || 365) / 30))) } : { size: 7, count: Math.min(10, Math.max(1, Math.ceil((periodDays || 70) / 7))) };
  const bucketCount = chartConfig.count;
  const bucketSize = chartConfig.size;
  const salesBuckets = Array.from({ length: bucketCount }, (_, index) => {
    const monthsAgo = bucketCount - index - 1;
    const start = chartGranularity === 'mensal'
      ? new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1)
      : new Date(now.getTime() - (bucketCount - index) * bucketSize * 86400000);
    const end = chartGranularity === 'mensal'
      ? new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 1)
      : new Date(start.getTime() + bucketSize * 86400000);
    const orders = filteredOrders.filter((pedido) => { const created = new Date(pedido.criado_em); return created >= start && created < end; });
    const value = revenueOf(orders);
    const label = chartGranularity === 'mensal'
      ? start.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
      : end.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    return { label, value, orders: orders.length, ticket: orders.length ? value / orders.length : 0 };
  });
  const maxSales = Math.max(1, ...salesBuckets.map((bucket) => bucket.value));
  const metrics = [
    ['usuarios', tr('Usuários'), 'user'], ['administradores', tr('Administradores'), 'user'],
    ['pecas', tr('Peças'), 'part'], ['pedidos', tr('Pedidos'), '▤'],
    ['pedidos_pendentes', tr('Pendentes'), '▤'], ['avaliacoes', tr('Avaliações'), 'star'],
    ['faturamento', tr('Faturamento'), '▤'], ['ticket_medio', tr('Ticket médio'), '▤'],
    ['taxa_conclusao', tr('Taxa de conclusão'), '▦'], ['taxa_cancelamento', tr('Taxa de cancelamento'), '▦'],
  ];
  const metricTooltips = {
    usuarios: tr('Total de contas ativas cadastradas na plataforma.'),
    administradores: tr('Contas que possuem acesso ao painel administrativo.'),
    pecas: tr('Total de anúncios de peças disponíveis no catálogo.'),
    pedidos: tr('Quantidade total de pedidos registrados na plataforma.'),
    pedidos_pendentes: tr('Pedidos que ainda aguardam pagamento ou ação operacional.'),
    avaliacoes: tr('Avaliações publicadas por compradores.'),
    faturamento: tr('Soma dos pedidos não cancelados no período e filtros selecionados.'),
    ticket_medio: tr('Valor médio dos pedidos não cancelados no recorte atual.'),
    taxa_conclusao: tr('Percentual de pedidos do período que foram entregues.'),
    taxa_cancelamento: tr('Percentual de pedidos do período que foram cancelados.'),
  };
  const orderCounts = STATUS.map((status) => [status, filteredOrders.filter((pedido) => pedido.status === status).length]);
  const maxOrders = Math.max(1, ...orderCounts.map(([, count]) => count));
  const lowStock = insights.pecas.filter((peca) => Number(peca.estoque_atual ?? peca.estoque) <= 3)
    .sort((a, b) => Number(a.estoque_atual ?? a.estoque) - Number(b.estoque_atual ?? b.estoque)).slice(0, 5);
  const supplierRanking = reviewType === 'fornecedores' ? Object.values(records.reduce((ranking, review) => {
    const key = String(review.fornecedor_id || review.fornecedor_loja || review.fornecedor_nome || 'sem-id');
    if (!ranking[key]) ranking[key] = { id: key, name: review.fornecedor_loja || review.fornecedor_nome || `Fornecedor #${review.fornecedor_id || '—'}`, total: 0, count: 0 };
    ranking[key].total += Number(review.nota || 0);
    ranking[key].count += 1;
    return ranking;
  }, {})).map((supplier) => ({ ...supplier, average: supplier.total / supplier.count }))
    .sort((a, b) => b.average - a.average || b.count - a.count).slice(0, 6) : [];
  const attentionItems = [
    { key: 'aguardando_pagamento', tone: 'warning', count: orderCounts.find(([status]) => status === 'aguardando_pagamento')?.[1] || 0, label: tr('pedidos aguardando pagamento') },
    { key: 'pago', tone: 'warning', count: orderCounts.find(([status]) => status === 'pago')?.[1] || 0, label: tr('pedidos pagos aguardando envio') },
    { key: 'cancelado', tone: 'danger', count: orderCounts.find(([status]) => status === 'cancelado')?.[1] || 0, label: tr('pedidos cancelados no período') },
  ];
  const recentActivity = [
    ...insights.pedidos.slice(0, 5).map((pedido) => ({ id: `p-${pedido.id}`, type: 'pedido', date: pedido.criado_em, title: `${tr('Pedido')} #${pedido.id} — ${translatedStatus[pedido.status] || pedido.status}`, detail: money(pedido.total || pedido.valor_total) })),
    ...insights.usuarios.slice(0, 4).map((user) => ({ id: `u-${user.id}`, type: 'usuario', date: user.created_at, title: tr('Novo usuário cadastrado'), detail: user.full_name || user.email })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);

  const dashboardFilters = <div className="admin-global-filters admin-grid-full"><div className="admin-filter-heading"><span>{tr('Visão gerencial')}</span><strong>{tr('Filtrar dashboard')}</strong><small>{tr('O recorte abaixo atualiza indicadores e gráficos.')}</small></div><div><span>{tr('Período')}</span><select value={periodDays} onChange={(event) => setPeriodDays(Number(event.target.value))}><option value="7">{tr('Últimos 7 dias')}</option><option value="30">{tr('Últimos 30 dias')}</option><option value="90">{tr('Últimos 90 dias')}</option><option value="365">{tr('Último ano')}</option><option value="0">{tr('Todo o período')}</option></select></div><div><span>{tr('Status')}</span><select value={dashboardStatus} onChange={(event) => setDashboardStatus(event.target.value)}><option value="">{tr('Todos os status')}</option>{STATUS.map((status) => <option key={status} value={status}>{translatedStatus[status]}</option>)}</select></div><div><span>{tr('Fornecedor')}</span><select value={dashboardSupplier} onChange={(event) => setDashboardSupplier(event.target.value)}><option value="">{tr('Todos os fornecedores')}</option>{suppliers.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></div><button onClick={() => { setPeriodDays(30); setDashboardStatus(''); setDashboardSupplier(''); }}>{tr('Limpar')}</button></div>;

  function dashboardWidget(key, index) {
    const metric = metrics.find(([metricKey]) => metricKey === key);
    if (metric) { const value = key in managerialValues ? managerialValues[key] : dash.state.dashboard?.[key] ?? 0; const formatted = key === 'faturamento' || key === 'ticket_medio' ? money(value) : key.startsWith('taxa_') ? `${value.toLocaleString(language === 'FR' ? 'fr-FR' : language === 'EN' ? 'en-US' : 'pt-BR', { maximumFractionDigits: 1 })}%` : value; const previous = previousManagerialValues[key]; const difference = key === 'taxa_conclusao' ? value - previous : key === 'pedidos' ? value - previous : percentageChange(value, previous); const comparable = periodDays && previous > 0 && !(key === 'faturamento' && previous < Math.max(100, value * .02)); const comparison = comparable ? `${difference >= 0 ? '↗' : '↘'} ${Math.abs(difference).toLocaleString(language === 'FR' ? 'fr-FR' : language === 'EN' ? 'en-US' : 'pt-BR', { maximumFractionDigits: 1 })}${key === 'taxa_conclusao' ? ' p.p.' : key === 'pedidos' ? '' : '%'} ${tr('vs. período anterior')}` : periodDays && key in previousManagerialValues ? tr('Sem base comparável no período anterior') : tr('No período selecionado'); return <article className="admin-metric-card admin-grid-metric admin-has-tooltip" data-tooltip={metricTooltips[key]} tabIndex="0" key={key}><span className="admin-tooltip-mark" aria-hidden="true">?</span><div className={`admin-metric-icon tone-${index % 4}`}><Icon name={metric[2]} /></div><div><span>{metric[1]}</span><strong>{formatted}</strong><small className={comparable ? (difference >= 0 ? 'trend-up' : 'trend-down') : ''}>{key in previousManagerialValues ? comparison : key === 'pedidos_pendentes' ? tr('Aguardando ação') : tr('Total registrado')}</small></div></article>; }
    if (key === 'boas_vindas') return <section className="admin-welcome admin-grid-full admin-welcome-compact" key={key}><div><span className="admin-live"><i /> {tr('OPERAÇÃO ATUALIZADA')}</span><h2>{language === 'EN' ? 'Hello' : language === 'FR' ? 'Bonjour' : 'Olá'}, {dash.state.admin.full_name?.split(' ')[0] || 'admin'}.</h2><p>{tr('Veja a saúde da operação e o que precisa da sua atenção.')}</p></div><span className="admin-session-status">● {tr('Administrador · Sessão protegida')}</span></section>;
    if (key === 'fluxo_pedidos') return <article className="admin-panel admin-chart-card admin-grid-wide" key={key}><div className="admin-panel-title"><div><h3>{tr('Fluxo de pedidos')}</h3><p>{tr('Distribuição dos pedidos no recorte atual.')}</p></div><span className="admin-data-badge">{filteredOrders.length} {tr('Pedidos').toLowerCase()}</span></div><div className="admin-bars">{orderCounts.map(([status, count]) => <button key={status} onClick={() => { setStatusFilter(status); setSection('pedidos'); }}><span>{translatedStatus[status]}</span><div><i style={{ width: `${filteredOrders.length ? count / filteredOrders.length * 100 : 0}%` }} /></div><strong>{count}</strong></button>)}</div></article>;
    if (key === 'estoque_baixo') return <article className="admin-panel admin-stock-card admin-grid-regular" key={key}><div className="admin-panel-title"><div><h3>Atenção ao estoque</h3><p>Peças com três unidades ou menos.</p></div><span className={`admin-data-badge ${lowStock.length ? 'is-warning' : ''}`}>{lowStock.length} alertas</span></div>{lowStock.length ? <div className="admin-stock-list">{lowStock.map((peca) => <button key={peca.id} onClick={() => setSection('pecas')}><span><strong>{peca.nome_peca || `Peça #${peca.id}`}</strong><small>{peca.sku || 'Sem SKU'}</small></span><b>{peca.estoque_atual ?? peca.estoque} un.</b></button>)}</div> : <div className="admin-healthy">✓ Estoque em níveis saudáveis</div>}</article>;
    if (key === 'atividade_recente') return <article className="admin-panel admin-grid-full" key={key}><div className="admin-panel-title"><h3>{tr('Atividade recente')}</h3><p>{tr('Movimentações mais relevantes da plataforma.')}</p></div><div className="admin-recent-users admin-operational-feed">{recentActivity.map((activity) => <button key={activity.id} onClick={() => setSection(activity.type === 'pedido' ? 'pedidos' : 'usuarios')}><span>{activity.type === 'pedido' ? '▤' : '＋'}</span><div><strong>{activity.title}</strong><small>{activity.detail}</small></div><time>{date(activity.date)}</time></button>)}</div></article>;
    if (key === 'seguranca') return <article className="admin-panel admin-security admin-grid-regular" key={key}><span className="admin-security-icon">✓</span><h3>Acesso protegido</h3><p>Você está autenticado com permissão administrativa. Todas as alterações passam pela API protegida.</p><div><span>Perfil</span><strong>Administrador</strong></div></article>;
    if (key === 'desempenho_vendas') return <article className="admin-panel admin-sales-chart admin-grid-wide" key={key}><div className="admin-panel-title"><div><h3>{tr('Evolução do faturamento')}</h3><p>{tr('Receita, volume de pedidos e ticket médio.')}</p></div><div className="admin-chart-range">{['diario', 'semanal', 'mensal'].map((range) => <button className={chartGranularity === range ? 'is-active' : ''} key={range} onClick={() => setChartGranularity(range)}>{tr(range === 'diario' ? 'Diário' : range === 'semanal' ? 'Semanal' : 'Mensal')}</button>)}</div></div><div className="admin-sales-columns">{salesBuckets.map((bucket) => <div className="admin-sales-column" key={bucket.label} tabIndex="0" aria-label={`${bucket.label}: ${money(bucket.value)}, ${bucket.orders} ${tr('Pedidos').toLowerCase()}, ticket ${money(bucket.ticket)}`}><b><strong>{bucket.label}</strong>{tr('Receita')}: {money(bucket.value)}<small>{bucket.orders} {tr('Pedidos').toLowerCase()} · {tr('Ticket médio')} {money(bucket.ticket)}</small></b><span style={{ height: `${Math.max(bucket.value ? 8 : 2, bucket.value / maxSales * 100)}%` }} /><small>{bucket.label}</small></div>)}</div><div className="admin-chart-legend"><span>● {tr('Receita')}</span></div></article>;
    if (key === 'requer_atencao') return <article className="admin-panel admin-attention-card admin-grid-regular" key={key}><div className="admin-panel-title"><div><h3>{tr('Requer atenção')}</h3><p>{tr('Itens que podem exigir uma ação agora.')}</p></div><span className="admin-data-badge is-warning">{attentionItems.reduce((sum, item) => sum + item.count, 0)}</span></div><div className="admin-attention-list">{attentionItems.map((item) => <button key={item.key} onClick={() => { setStatusFilter(item.key); setSection('pedidos'); }}><i className={`is-${item.tone}`} /><strong>{item.count}</strong><span>{item.label}</span><b>→</b></button>)}</div></article>;
    if (key === 'resumo_plataforma') return <article className="admin-panel admin-platform-card admin-grid-regular" key={key}><div className="admin-panel-title"><h3>{tr('Plataforma')}</h3><p>{tr('Dimensão atual da base.')}</p></div><div className="admin-platform-stats"><button onClick={() => setSection('usuarios')}><strong>{dash.state.dashboard?.usuarios || 0}</strong><span>{tr('Usuários')}</span></button><button onClick={() => setSection('pecas')}><strong>{dash.state.dashboard?.pecas || 0}</strong><span>{tr('Peças')}</span></button><button onClick={() => setSection('usuarios')}><strong>{dash.state.dashboard?.administradores || 0}</strong><span>{tr('Admins')}</span></button><button onClick={() => setSection('avaliacoes')}><strong>{dash.state.dashboard?.avaliacoes || 0}</strong><span>{tr('Avaliações')}</span></button></div></article>;
    if (key === 'produtos_top') return <article className="admin-panel admin-top-products admin-grid-regular" key={key}><div className="admin-panel-title"><h3>Peças mais vendidas</h3><p>Ranking por unidades no período.</p></div>{productRanking.length ? productRanking.map((product, position) => <div className="admin-top-product" key={product.id}><b>{position + 1}</b><span><strong>{product.name}</strong><small>{money(product.revenue)}</small></span><em>{product.units} un.</em></div>) : <div className="admin-healthy">Sem vendas no período</div>}</article>;
    return null;
  }

  return <div className="admin-page"><Header /><div className="admin-shell">
    <aside className="admin-sidebar">
      <div className="admin-sidebar-brand"><span>BP</span><div><strong>Admin</strong><small>Central de gestão</small></div></div>
      <nav>{adminNav.map(([id, label, icon]) => <button key={id} className={section === id ? 'is-active' : ''} onClick={() => setSection(id)}><Icon name={icon} />{label}</button>)}</nav>
      <div className="admin-sidebar-user"><span>{(dash.state.admin.full_name || 'A')[0]}</span><div><strong>{dash.state.admin.full_name || 'Administrador'}</strong><small>{dash.state.admin.email}</small></div></div>
    </aside>

    <main className="admin-main">
      <header className="admin-page-heading"><div><span className="admin-eyebrow">{tr('Painel administrativo')}</span><h1>{title}</h1><p>{descriptions[section]}</p></div><div className="admin-heading-actions">{section === 'overview' && !dash.customizing && <button className="admin-layout-trigger" onClick={dash.toggleCustomizing} title={tr('Organizar dashboard')} aria-label={tr('Organizar dashboard')}>⚙</button>}<button className="admin-primary" onClick={() => setModal(true)}>＋ {tr('Novo administrador')}</button></div></header>
      {notice.text && <div className={`admin-notice admin-notice--${notice.type}`}>{notice.text}<button onClick={() => setNotice({ type: '', text: '' })}>×</button></div>}
      {section === 'overview' && <>
        {dash.customizing && <div className="admin-layout-toolbar"><div><span className="admin-live"><i /> {tr('EDIÇÃO AO VIVO')}</span><strong>{tr('Organize seu dashboard')}</strong><small>{tr('Arraste os cards pela alça para mudar a ordem.')}</small></div><aside><button className="admin-reset-button" onClick={() => dash.savePreferences(WIDGETS_PADRAO)}>↺ {t('restoreDefault')}</button><button onClick={dash.toggleCustomizing}>{t('cancel')}</button><button className="admin-primary" disabled={dash.saving} onClick={() => dash.savePreferences()}>{dash.saving ? t('saving') : tr('Salvar layout')}</button></aside></div>}
        <section className={`admin-dashboard-layout ${dash.customizing ? 'is-customizing' : ''}`}>{dash.visibleWidgets.map((key, index) => <Fragment key={key}><div className={`admin-layout-item admin-grid-${WIDGETS_ADMIN[key].type} ${draggingWidget === key ? 'is-dragging' : ''}`} draggable={dash.customizing} onDragStart={(event) => { setDraggingWidget(key); event.dataTransfer.effectAllowed = 'move'; }} onDragEnd={() => setDraggingWidget('')} onDragEnter={(event) => { event.preventDefault(); if (dash.customizing && draggingWidget && draggingWidget !== key) dash.reorderWidget(draggingWidget, key); }} onDragOver={(event) => { if (dash.customizing) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; } }} onDrop={(event) => { event.preventDefault(); setDraggingWidget(''); }}>{dash.customizing && <div className="admin-card-editor"><span className="admin-card-drag">⠿</span><strong>{t(WIDGETS_ADMIN[key].label)}</strong><span>{index + 1}</span><button onClick={() => dash.toggleWidget(key)} aria-label="Ocultar widget">×</button></div>}{dashboardWidget(key, index)}</div>{key === 'boas_vindas' && !dash.customizing && dashboardFilters}</Fragment>)}</section>
        {dash.customizing && dash.draftWidgets.length < Object.keys(WIDGETS_ADMIN).length && <div className="admin-inline-hidden"><span>{tr('Widgets ocultos')}</span>{Object.entries(WIDGETS_ADMIN).filter(([key]) => !dash.draftWidgets.includes(key)).map(([key, widget]) => <button key={key} onClick={() => dash.toggleWidget(key)}>＋ {tr(t(widget.label))}</button>)}</div>}
      </>}

      {section !== 'overview' && <section className="admin-panel admin-data-panel">
        <div className="admin-data-toolbar">
          {(section === 'usuarios' || section === 'pecas') && <form className="admin-search" onSubmit={(e) => { e.preventDefault(); load(); }}><SearchIcon size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`${tr('Buscar')} ${title.toLowerCase()}…`} /><button>{tr('Buscar')}</button></form>}
          {section === 'pedidos' && <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="">{tr('Todos os status')}</option>{STATUS.map((item) => <option key={item} value={item}>{translatedStatus[item]}</option>)}</select>}
          {section === 'avaliacoes' && <div className="admin-segmented"><button className={reviewType === 'produtos' ? 'is-active' : ''} onClick={() => setReviewType('produtos')}>{tr('Produtos')}</button><button className={reviewType === 'fornecedores' ? 'is-active' : ''} onClick={() => setReviewType('fornecedores')}>{tr('Fornecedores')}</button></div>}
          <span className="admin-result-count">{records.length} {tr('registros')}</span>
        </div>
        {section === 'avaliacoes' && reviewType === 'fornecedores' && !loadingList && supplierRanking.length > 0 && <div className="admin-supplier-ranking"><div className="admin-ranking-heading"><div><span className="admin-eyebrow">Reputação dos parceiros</span><h3>Fornecedores mais bem avaliados</h3><p>Ranking pela média das avaliações recebidas.</p></div><span>★ Média geral</span></div><div className="admin-ranking-bars">{supplierRanking.map((supplier, index) => <article key={supplier.id}><span className="admin-ranking-position">{index + 1}</span><div className="admin-ranking-name"><strong>{supplier.name}</strong><small>{supplier.count} {supplier.count === 1 ? 'avaliação' : 'avaliações'}</small></div><div className="admin-ranking-track"><i style={{ width: `${(supplier.average / 5) * 100}%` }} /></div><b>{supplier.average.toFixed(1)}</b><span className="admin-ranking-star">★</span></article>)}</div></div>}
        {loadingList ? <div className="admin-table-loading"><div className="admin-spinner" /> {tr('Carregando registros…')}</div> : records.length === 0 ? <div className="admin-empty"><span>◇</span><p>{tr('Nenhum registro encontrado.')}</p></div> : <div className="admin-table-wrap"><table><thead><tr>
          {section === 'usuarios' && <><th>{tr('Usuário')}</th><th>{tr('Perfil')}</th><th>{tr('Cadastro')}</th><th>{tr('Permissão')}</th><th>{tr('Ações')}</th></>}
          {section === 'pecas' && <><th>{tr('Peça')}</th><th>SKU / OEM</th><th>{tr('Preço')}</th><th>{tr('Estoque')}</th><th>{tr('Ações')}</th></>}
          {section === 'pedidos' && <><th>{tr('Pedido')}</th><th>{tr('Cliente')}</th><th>{tr('Valor')}</th><th>{tr('Status')}</th></>}
          {section === 'avaliacoes' && <><th>{tr(reviewType === 'fornecedores' ? 'Loja fornecedora' : 'Peça avaliada')}</th><th>{tr('Pedido')}</th><th>{tr('Nota')}</th><th>{tr('Comentário')}</th><th>{tr('Data')}</th><th>{tr('Ações')}</th></>}
        </tr></thead><tbody>{records.map((item) => <tr key={item.id}>
          {section === 'usuarios' && <><td><div className="admin-person"><span>{(item.full_name || item.email || '?')[0]}</span><div><strong>{item.full_name || tr('Sem nome')}</strong><small>{item.email}</small></div></div></td><td>{item.nome_loja || tr('Usuário')}</td><td>{date(item.created_at)}</td><td><button disabled={busy === `u${item.id}`} className={`admin-role-toggle ${item.is_admin ? 'is-admin' : ''}`} onClick={() => toggleAdmin(item)}>{item.is_admin ? tr('Administrador') : tr('Tornar admin')}</button></td><td><div className="admin-row-actions"><button className="admin-icon-edit" title={tr('Editar usuário')} onClick={() => setEditing({ type: 'usuario', id: item.id, data: { full_name: item.full_name || '', email: item.email || '', telefone: item.telefone || '', nome_loja: item.nome_loja || '' } })}>✎</button><button className="admin-icon-danger" title={tr('Excluir usuário')} onClick={() => setConfirming({ type: 'usuario', item, title: tr('Excluir usuário?'), description: tr('A conta perderá o acesso imediatamente.') })}><TrashIcon size={17} /></button></div></td></>}
          {section === 'pecas' && <><td><strong>{item.nome_peca || item.nome || `${tr('Peça')} #${item.id}`}</strong></td><td><span className="admin-code">{item.sku || item.oem_number || '—'}</span></td><td>{money(item.preco)}</td><td>{item.estoque_atual ?? item.estoque ?? '—'}</td><td><div className="admin-row-actions"><button className="admin-icon-edit" title={tr('Editar peça')} onClick={() => setEditing({ type: 'peca', id: item.id, data: { nome_peca: item.nome_peca || '', preco: item.preco ?? '', estoque_atual: item.estoque_atual ?? 0 } })}>✎</button><button className="admin-icon-danger" title={tr('Excluir peça')} onClick={() => setConfirming({ type: 'peca', item, title: tr('Remover peça?'), description: tr('A peça será retirada permanentemente do catálogo.') })}><TrashIcon size={17} /></button></div></td></>}
          {section === 'pedidos' && <><td><strong>#{item.id}</strong><small className="admin-cell-sub">{date(item.criado_em)}</small></td><td>{item.comprador_nome || item.usuario_nome || item.email || '—'}</td><td>{money(item.valor_total || item.total)}</td><td><select className="admin-status" value={item.status || ''} onChange={(e) => action(`o${item.id}`, async () => adminGateway.atualizarPedido(await getToken(), item.id, e.target.value), 'Status atualizado.')}><option value="" disabled>{tr('Status')}</option>{STATUS.map((value) => <option key={value} value={value}>{translatedStatus[value]}</option>)}</select></td></>}
          {section === 'avaliacoes' && <><td><strong>{reviewType === 'fornecedores' ? (item.fornecedor_loja || item.fornecedor_nome || `${tr('Fornecedor')} #${item.fornecedor_id || '—'}`) : (item.peca_nome || `${tr('Peça')} #${item.peca_id || '—'}`)}</strong></td><td><span className="admin-code">#{item.pedido_id || '—'}</span></td><td><div className="admin-stars">{'★'.repeat(Math.min(5, Number(item.nota) || 0))}<span>{item.nota || '—'}</span></div></td><td className="admin-comment">{item.comentario || item.descricao || tr('Sem comentário')}</td><td>{date(item.data_avaliacao)}</td><td><div className="admin-row-actions"><button className="admin-icon-edit" title={tr('Editar avaliação')} onClick={() => setEditing({ type: 'avaliacao', id: item.id, data: { nota: item.nota || 1, comentario: item.comentario || '' } })}>✎</button><button className="admin-icon-danger" title={tr('Excluir avaliação')} onClick={() => setConfirming({ type: 'avaliacao', item, title: tr('Remover avaliação?'), description: tr('A nota e o comentário serão excluídos permanentemente.') })}><TrashIcon size={17} /></button></div></td></>}
        </tr>)}</tbody></table></div>}
      </section>}
    </main>
  </div>

  {modal && <div className="admin-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setModal(false)}><section className="admin-modal" role="dialog" aria-modal="true"><button className="admin-modal-close" onClick={() => setModal(false)}>×</button><span className="admin-modal-icon"><UserIcon size={24} /></span><span className="admin-eyebrow">{tr('Gerenciamento de acesso')}</span><h2>{tr('Novo administrador')}</h2><p>{tr('Crie uma conta verificada com acesso imediato ao painel.')}</p><form onSubmit={createAdmin}><label>{tr('Nome completo')}<input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} minLength="3" required autoFocus /></label><label>{t('email')}<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label><label>{tr('Senha temporária')}<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength="8" required /><small>{tr('Mínimo de 8 caracteres, contendo letras e números.')}</small></label><div className="admin-modal-actions"><button type="button" onClick={() => setModal(false)}>{tr('Cancelar')}</button><button className="admin-primary" disabled={busy === 'create'}>{busy === 'create' ? tr('Criando…') : tr('Criar administrador')}</button></div></form></section></div>}
  {editing && <div className="admin-modal-backdrop"><section className="admin-modal" role="dialog" aria-modal="true"><button className="admin-modal-close" onClick={() => setEditing(null)}>×</button><span className="admin-modal-icon">✎</span><span className="admin-eyebrow">{tr('Edição administrativa')}</span><h2>{tr('Editar')} {tr(editing.type === 'usuario' ? 'usuário' : editing.type === 'peca' ? 'peça' : 'avaliação')}</h2><p>{tr('Revise os dados antes de salvar a alteração.')}</p><form onSubmit={saveEdit}>
    {editing.type === 'usuario' && <><label>{tr('Nome completo')}<input value={editing.data.full_name} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, full_name: e.target.value } })} required /></label><label>{t('email')}<input type="email" value={editing.data.email} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, email: e.target.value } })} required /><small>{tr('O e-mail de acesso também será atualizado.')}</small></label><label>{tr('Telefone')}<input value={editing.data.telefone} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, telefone: e.target.value } })} /></label><label>{tr('Nome da loja')}<input value={editing.data.nome_loja} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, nome_loja: e.target.value } })} /></label></>}
    {editing.type === 'peca' && <><label>{tr('Nome da peça')}<input value={editing.data.nome_peca} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, nome_peca: e.target.value } })} required /></label><label>{tr('Preço')}<input type="number" min="0.01" step="0.01" value={editing.data.preco} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, preco: e.target.value } })} required /></label><label>{tr('Estoque')}<input type="number" min="0" step="1" value={editing.data.estoque_atual} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, estoque_atual: e.target.value } })} required /></label></>}
    {editing.type === 'avaliacao' && <><label>{tr('Nota')}<select value={editing.data.nota} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, nota: e.target.value } })}>{[1,2,3,4,5].map((n) => <option key={n} value={n}>{n} {tr(n > 1 ? 'estrelas' : 'estrela')}</option>)}</select></label><label>{tr('Comentário')}<textarea rows="4" maxLength="1000" value={editing.data.comentario} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, comentario: e.target.value } })} /></label></>}
    <div className="admin-modal-actions"><button type="button" onClick={() => setEditing(null)}>{tr('Cancelar')}</button><button className="admin-primary" disabled={busy === `edit-${editing.id}`}>{tr('Salvar alterações')}</button></div></form></section></div>}
  {dash.customizing && <div className="admin-modal-backdrop"><section className="admin-customize-modal" role="dialog" aria-modal="true"><header className="admin-customize-header"><div className="admin-customize-title"><span className="admin-modal-icon">⚙</span><div><span className="admin-eyebrow">Seu espaço de trabalho</span><h2>Personalizar dashboard</h2><p>Escolha o que é importante e organize na ordem que preferir.</p></div></div><button className="admin-modal-close" onClick={dash.toggleCustomizing}>×</button></header><div className="admin-customize-body"><div className="admin-customize-editor"><div className="admin-customize-section-title"><div><strong>Indicadores visíveis</strong><small>Arraste os cartões para reordenar</small></div><span>{dash.draftWidgets.length} de {Object.keys(WIDGETS_ADMIN).length}</span></div><div className="admin-widget-editor">{dash.draftWidgets.map((key, position) => <div draggable key={key} className={`admin-widget-row ${draggingWidget === key ? 'is-dragging' : ''}`} onDragStart={() => setDraggingWidget(key)} onDragEnd={() => setDraggingWidget('')} onDragOver={(event) => event.preventDefault()} onDrop={() => { dash.reorderWidget(draggingWidget, key); setDraggingWidget(''); }}><span className="admin-drag-handle" title="Arrastar">⠿</span><span className={`admin-widget-symbol tone-${position % 4}`}><Icon name={metrics.find(([metricKey]) => metricKey === key)?.[2] || '▦'} size={17} /></span><div><strong>{t(WIDGETS_ADMIN[key].label)}</strong><small>Posição {position + 1}</small></div><aside><button disabled={position === 0} onClick={() => dash.moveWidget(key, -1)} aria-label="Mover para cima">↑</button><button disabled={position === dash.draftWidgets.length - 1} onClick={() => dash.moveWidget(key, 1)} aria-label="Mover para baixo">↓</button><button className="admin-widget-remove" onClick={() => dash.toggleWidget(key)} aria-label="Ocultar indicador">×</button></aside></div>)}</div>{dash.draftWidgets.length < Object.keys(WIDGETS_ADMIN).length && <><div className="admin-customize-section-title admin-hidden-title"><div><strong>Indicadores ocultos</strong><small>Adicione novamente com um clique</small></div></div><div className="admin-hidden-widgets">{Object.entries(WIDGETS_ADMIN).filter(([key]) => !dash.draftWidgets.includes(key)).map(([key, widget]) => <button key={key} onClick={() => dash.toggleWidget(key)}>＋ {t(widget.label)}</button>)}</div></>}</div><aside className="admin-dashboard-preview"><div className="admin-preview-top"><div><span className="admin-live"><i /> PRÉVIA AO VIVO</span><h3>Visão geral</h3></div><span>{dash.draftWidgets.length} indicadores</span></div><div className="admin-preview-metrics">{dash.draftWidgets.map((key, index) => <article key={key}><span className={`admin-widget-symbol tone-${index % 4}`}><Icon name={metrics.find(([metricKey]) => metricKey === key)?.[2] || '▦'} size={15} /></span><div><small>{t(WIDGETS_ADMIN[key].label)}</small><strong>{dash.state.dashboard?.[key] ?? 0}</strong></div></article>)}</div><div className="admin-preview-hint"><span>✓</span><p><strong>Salvo no seu perfil</strong>Esta organização será mantida nos próximos acessos.</p></div></aside></div><footer className="admin-customize-footer"><button className="admin-reset-button" onClick={() => dash.savePreferences(WIDGETS_PADRAO)}>↺ Restaurar padrão</button><div><button onClick={dash.toggleCustomizing}>Cancelar</button><button className="admin-primary" disabled={dash.saving} onClick={() => dash.savePreferences()}>{dash.saving ? 'Salvando…' : 'Salvar alterações'}</button></div>{dash.feedback && <p className="admin-customize-feedback">{dash.feedback}</p>}</footer></section></div>}
  {confirming && <div className="admin-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setConfirming(null)}><section className="admin-confirm" role="alertdialog" aria-modal="true"><span className="admin-confirm-icon"><TrashIcon size={24} /></span><h2>{tr(confirming.title)}</h2><p>{tr(confirming.description)}</p><div className="admin-confirm-warning">{tr('Esta ação não poderá ser desfeita.')}</div><div className="admin-modal-actions"><button type="button" onClick={() => setConfirming(null)}>{tr('Cancelar')}</button><button className="admin-danger-button" onClick={confirmDelete}>{tr('Sim, excluir')}</button></div></section></div>}
  </div>;
}
