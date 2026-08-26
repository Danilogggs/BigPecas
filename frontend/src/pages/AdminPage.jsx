import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import useAdminDashboard from '../features/admin/application/useAdminDashboard';
import { WIDGETS_ADMIN as WIDGETS } from '../features/admin/domain/dashboard';
import './AdminPage.css';

export default function AdminPage() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { t } = useLanguage();
  const {
    state, widgets, draftWidgets, customizing, saving, feedback, visibleWidgets,
    moveWidget, savePreferences, toggleCustomizing, toggleWidget,
  } = useAdminDashboard({ getToken, t });

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
                onClick={toggleCustomizing}
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
