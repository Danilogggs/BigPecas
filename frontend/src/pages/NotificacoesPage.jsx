import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { useLanguage } from '../contexts/LanguageContext';
import useNotificacoes from '../features/notificacoes/application/useNotificacoes';
import { formatarDataNotificacao as formatDate } from '../features/notificacoes/presentation/notificacaoPresentation';

const CREAM = 'var(--bp-cream)';
const BORDER = 'var(--bp-border)';
const TEXT = 'var(--bp-text)';
const MUTED = 'var(--bp-text-muted)';
const WHITE = 'var(--bp-surface)';

export default function NotificacoesPage() {
  const { error, loading, marcarComoLida, notificacoes } = useNotificacoes();
  const { t } = useLanguage();

  return (
    <div style={{ minHeight: '100vh', background: CREAM }}>
      <Header />

      <main style={{ maxWidth: 980, margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
        <h1 style={{ margin: '0 0 1.25rem', color: TEXT, fontSize: '2rem' }}>
          {t('notifications')}
        </h1>

        {loading && <Box>{t('loadingNotifications')}</Box>}
        {error && !loading && <Box danger>{error}</Box>}

        {!loading && !error && notificacoes.length === 0 && (
          <Box>{t('noNotifications')}</Box>
        )}

        {!loading && !error && notificacoes.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {notificacoes.map((notificacao) => {
              const lida = Boolean(notificacao.lida_em);
              return (
                <article
                  key={notificacao.id}
                  style={{
                    background: lida ? 'var(--bp-surface-muted)' : WHITE,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 14,
                    padding: '1rem 1.1rem',
                    color: TEXT,
                    opacity: lida ? 0.62 : 1,
                    boxShadow: lida ? 'none' : '0 8px 20px rgba(21,34,24,.06)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '.75rem', color: MUTED, marginBottom: 4 }}>
                        {notificacao.tipo}
                        {notificacao.criada_em ? ` • ${formatDate(notificacao.criada_em)}` : ''}
                      </div>
                      <h2 style={{ margin: '0 0 .35rem', fontSize: '1rem' }}>
                        {notificacao.titulo}
                      </h2>
                      <p style={{ margin: 0, color: MUTED, lineHeight: 1.5 }}>
                        {notificacao.mensagem}
                        {notificacao.peca_id && <><br /><Link to={notificacao.tipo === 'nova_peca_para_validar'
                          ? '/avaliador/validar/' + notificacao.peca_id : '/editar-pecas'}>{t('viewListingEvaluation')}</Link></>}
                      </p>
                    </div>

                    {!lida && (
                      <button
                        type="button"
                        onClick={() => marcarComoLida(notificacao.id)}
                        style={{
                          border: 0,
                          borderRadius: 10,
                          background: 'var(--bp-primary-action)',
                          color: 'var(--bp-on-primary)',
                          padding: '10px 12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          height: 'fit-content',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {t('markAsRead')}
                      </button>
                    )}
                  </div>

                  <div style={{ marginTop: 10, fontSize: '.78rem', color: MUTED }}>
                    {notificacao.lida_em ? `${t('readAt')} ${formatDate(notificacao.lida_em)}` : t('notRead')}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function Box({ children, danger = false }) {
  return (
    <div
      style={{
        background: danger ? 'var(--bp-error-bg)' : WHITE,
        color: danger ? 'var(--bp-error)' : TEXT,
        border: `1px solid ${danger ? '#FCA5A5' : BORDER}`,
        borderRadius: 14,
        padding: '1rem 1.1rem',
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  );
}
