import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import { AUTH_API_URL } from '../services/apiConfig';
import { useLanguage } from '../contexts/LanguageContext';
import './AdminPage.css';

const DEFAULT_WIDGETS = ['usuarios', 'pecas', 'pedidos', 'pedidos_pendentes', 'avaliacoes'];
const WIDGETS = {
  usuarios: { label: 'adminUsers' },
  administradores: { label: 'adminAdministrators' },
  pecas: { label: 'adminParts' },
  pedidos: { label: 'adminOrders' },
  pedidos_pendentes: { label: 'adminPending' },
  avaliacoes: { label: 'adminReviews' },
};

export default function AdminPage() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { t } = useLanguage();
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
        if (!token) throw new Error(t('sessionRequired'));

        const headers = { Authorization: `Bearer ${token}` };
        const [meResponse, dashboardResponse, preferencesResponse] = await Promise.all([
          fetch(`${AUTH_API_URL}/api/admin/me`, { headers }),
          fetch(`${AUTH_API_URL}/api/admin/dashboard`, { headers }),
          fetch(`${AUTH_API_URL}/api/admin/preferencias`, { headers }),
        ]);

        if (meResponse.status === 403) {
          throw new Error(t('adminPermissionDenied'));
        }
        if (!meResponse.ok || !dashboardResponse.ok || !preferencesResponse.ok) {
          throw new Error(t('adminUnavailable'));
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
      if (!response.ok) throw new Error(t('adminSaveFailed'));
      setWidgets(nextWidgets);
      setDraftWidgets(nextWidgets);
      setCustomizing(false);
      setFeedback(t('adminSaved'));
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
            <p>{t('adminChecking')}</p>
          </section>
        )}

        {!state.loading && state.error && (
          <section className="admin-card admin-card--center">
            <div className="admin-status admin-status--error">{t('adminUnauthorized')}</div>
            <h1>{t('administration')}</h1>
            <p>{state.error}</p>
            <button onClick={() => navigate('/')}>{t('backHome')}</button>
          </section>
        )}

        {!state.loading && state.admin && (
          <>
            <section className="admin-card admin-hero">
              <div>
                <span className="admin-status">{t('adminPermissionConfirmed')}</span>
                <h1>{t('adminDashboard')}</h1>
                <p>{t('adminGreeting', { name: state.admin.full_name || state.admin.email })}</p>
              </div>
              <div className="admin-check" aria-label={t('adminAccessConfirmed')}>✓</div>
            </section>

            <div className="admin-toolbar">
              <div>
                <h2>{t('overview')}</h2>
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
                {customizing ? t('cancel') : t('customizeDashboard')}
              </button>
            </div>

            {customizing && (
              <section className="admin-card admin-customizer">
                <div>
                  <div className="admin-customizer__heading">
                    <div>
                      <h3>{t('chooseWidgets')}</h3>
                        <p>{t('widgetPreviewHelp')}</p>
                    </div>
                    <span className="admin-preview-badge">{t('livePreview')}</span>
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
                          {t(widget.label)}
                        </label>
                        <div className="admin-order-buttons">
                          <button disabled={!enabled || position === 0} onClick={() => moveWidget(key, -1)} aria-label={`${t('move')} ${t(widget.label)} ${t('left')}`}>←</button>
                          <button disabled={!enabled || position === draftWidgets.length - 1} onClick={() => moveWidget(key, 1)} aria-label={`${t('move')} ${t(widget.label)} ${t('right')}`}>→</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="admin-customizer__actions">
                  <button className="admin-button-secondary" disabled={saving} onClick={() => savePreferences(DEFAULT_WIDGETS)}>{t('restoreDefault')}</button>
                  <button className="admin-button-primary" disabled={saving} onClick={() => savePreferences()}>{saving ? t('saving') : t('saveCustomization')}</button>
                </div>
              </section>
            )}

            <section className={`admin-preview ${customizing ? 'is-previewing' : ''}`}>
              {customizing && (
                <div className="admin-preview__label">
                  <span>{t('dashboardPreview')}</span>
                  <small>{draftWidgets.length} {draftWidgets.length === 1 ? t('widgetVisible') : t('widgetsVisible')}</small>
                </div>
              )}
              <div className="admin-metrics" aria-label={t('platformSummary')}>
              {visibleWidgets.map((key, index) => (
                <article className="admin-card admin-metric" key={key}>
                  {customizing && <span className="admin-metric__position">{index + 1}</span>}
                  <strong>{state.dashboard[key] ?? 0}</strong>
                  <span>{t(WIDGETS[key].label)}</span>
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
