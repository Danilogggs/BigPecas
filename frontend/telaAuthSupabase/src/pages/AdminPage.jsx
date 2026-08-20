import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import { AUTH_API_URL } from '../services/apiConfig';
import './AdminPage.css';

const DEFAULT_WIDGETS = ['usuarios', 'pecas', 'pedidos', 'pedidos_pendentes', 'avaliacoes'];
const WIDGETS = {
  usuarios: { label: 'Usuários' },
  administradores: { label: 'Administradores' },
  pecas: { label: 'Peças' },
  pedidos: { label: 'Pedidos' },
  pedidos_pendentes: { label: 'Pendentes' },
  avaliacoes: { label: 'Avaliações' },
};

export default function AdminPage() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [state, setState] = useState({ loading: true, error: '', admin: null, dashboard: null });
  const [widgets, setWidgets] = useState(DEFAULT_WIDGETS);
  const [draftWidgets, setDraftWidgets] = useState(DEFAULT_WIDGETS);
  const [customizing, setCustomizing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const visibleWidgets = customizing ? draftWidgets : widgets;

  useEffect(() => {
    let active = true;

    async function verifyAdmin() {
      try {
        const token = await getToken();
        if (!token) throw new Error('Sessão não encontrada. Entre novamente.');

        const headers = { Authorization: `Bearer ${token}` };
        const [meResponse, dashboardResponse, preferencesResponse] = await Promise.all([
          fetch(`${AUTH_API_URL}/api/admin/me`, { headers }),
          fetch(`${AUTH_API_URL}/api/admin/dashboard`, { headers }),
          fetch(`${AUTH_API_URL}/api/admin/preferencias`, { headers }),
        ]);

        if (meResponse.status === 403) {
          throw new Error('Sua conta não possui permissão de administrador.');
        }
        if (!meResponse.ok || !dashboardResponse.ok || !preferencesResponse.ok) {
          throw new Error('Não foi possível acessar a área administrativa. Verifique se o backend está ligado.');
        }

        const [me, dashboard, preferences] = await Promise.all([
          meResponse.json(), dashboardResponse.json(), preferencesResponse.json(),
        ]);
        const savedWidgets = preferences?.config?.widgets?.filter((widget) => WIDGETS[widget]);
        if (active) {
          setWidgets(savedWidgets?.length ? savedWidgets : DEFAULT_WIDGETS);
          setDraftWidgets(savedWidgets?.length ? savedWidgets : DEFAULT_WIDGETS);
          setState({ loading: false, error: '', admin: me.admin, dashboard });
        }
      } catch (error) {
        if (active) setState({ loading: false, error: error.message, admin: null, dashboard: null });
      }
    }

    verifyAdmin();
    return () => { active = false; };
  }, [getToken]);

  function toggleWidget(widget) {
    setDraftWidgets((current) => current.includes(widget)
      ? (current.length === 1 ? current : current.filter((item) => item !== widget))
      : [...current, widget]);
  }

  function moveWidget(widget, direction) {
    setDraftWidgets((current) => {
      const index = current.indexOf(widget);
      const destination = index + direction;
      if (index < 0 || destination < 0 || destination >= current.length) return current;
      const reordered = [...current];
      [reordered[index], reordered[destination]] = [reordered[destination], reordered[index]];
      return reordered;
    });
  }

  async function savePreferences(nextWidgets = draftWidgets) {
    setSaving(true);
    setFeedback('');
    try {
      const token = await getToken();
      const response = await fetch(`${AUTH_API_URL}/api/admin/preferencias`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ widgets: nextWidgets }),
      });
      if (!response.ok) throw new Error('Não foi possível salvar a personalização.');
      setWidgets(nextWidgets);
      setDraftWidgets(nextWidgets);
      setCustomizing(false);
      setFeedback('Personalização salva. Ela será mantida no próximo acesso.');
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-page">
      <Header />
      <main className="admin-page__content">
        {state.loading && (
          <section className="admin-card admin-card--center">
            <div className="admin-spinner" />
            <p>Verificando permissão administrativa…</p>
          </section>
        )}

        {!state.loading && state.error && (
          <section className="admin-card admin-card--center">
            <div className="admin-status admin-status--error">Acesso não autorizado</div>
            <h1>Área administrativa</h1>
            <p>{state.error}</p>
            <button onClick={() => navigate('/')}>Voltar ao início</button>
          </section>
        )}

        {!state.loading && state.admin && (
          <>
            <section className="admin-card admin-hero">
              <div>
                <span className="admin-status">Permissão confirmada</span>
                <h1>Painel administrativo</h1>
                <p>Olá, {state.admin.full_name || state.admin.email}. O acesso de administrador está funcionando.</p>
              </div>
              <div className="admin-check" aria-label="Acesso confirmado">✓</div>
            </section>

            <div className="admin-toolbar">
              <div>
                <h2>Visão geral</h2>
                {feedback && <p className="admin-feedback" role="status">{feedback}</p>}
              </div>
              <button
                className="admin-customize-button"
                onClick={() => {
                  setDraftWidgets(widgets);
                  setCustomizing((value) => !value);
                  setFeedback('');
                }}
              >
                {customizing ? 'Cancelar' : 'Personalizar painel'}
              </button>
            </div>

            {customizing && (
              <section className="admin-card admin-customizer">
                <div>
                  <div className="admin-customizer__heading">
                    <div>
                      <h3>Escolha e ordene os widgets</h3>
                      <p>As mudanças aparecem imediatamente na prévia abaixo.</p>
                    </div>
                    <span className="admin-preview-badge">Prévia ao vivo</span>
                  </div>
                </div>
                <div className="admin-widget-options">
                  {Object.entries(WIDGETS).map(([key, widget]) => {
                    const enabled = draftWidgets.includes(key);
                    const position = draftWidgets.indexOf(key);
                    return (
                      <div className={`admin-widget-option ${enabled ? 'is-enabled' : ''}`} key={key}>
                        <label>
                          <input type="checkbox" checked={enabled} onChange={() => toggleWidget(key)} />
                          {widget.label}
                        </label>
                        <div className="admin-order-buttons">
                          <button disabled={!enabled || position === 0} onClick={() => moveWidget(key, -1)} aria-label={`Mover ${widget.label} para esquerda`}>←</button>
                          <button disabled={!enabled || position === draftWidgets.length - 1} onClick={() => moveWidget(key, 1)} aria-label={`Mover ${widget.label} para direita`}>→</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="admin-customizer__actions">
                  <button className="admin-button-secondary" disabled={saving} onClick={() => savePreferences(DEFAULT_WIDGETS)}>Restaurar padrão</button>
                  <button className="admin-button-primary" disabled={saving} onClick={() => savePreferences()}>{saving ? 'Salvando…' : 'Salvar personalização'}</button>
                </div>
              </section>
            )}

            <section className={`admin-preview ${customizing ? 'is-previewing' : ''}`}>
              {customizing && (
                <div className="admin-preview__label">
                  <span>Prévia do painel</span>
                  <small>{draftWidgets.length} {draftWidgets.length === 1 ? 'widget visível' : 'widgets visíveis'}</small>
                </div>
              )}
              <div className="admin-metrics" aria-label="Resumo da plataforma">
              {visibleWidgets.map((key, index) => (
                <article className="admin-card admin-metric" key={key}>
                  {customizing && <span className="admin-metric__position">{index + 1}</span>}
                  <strong>{state.dashboard[key] ?? 0}</strong>
                  <span>{WIDGETS[key].label}</span>
                </article>
              ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
