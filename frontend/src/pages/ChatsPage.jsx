import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import {
  BORDER_RADIUS,
  BUTTON_PRIMARY_STYLE,
  BUTTON_SECONDARY_STYLE,
  COLORS,
  SHADOWS,
  SPACING,
} from '../styles/theme';
import { useLanguage } from '../contexts/LanguageContext';
import useConversasAtivas from '../features/chat/application/useConversasAtivas';
import { nomeParticipante } from '../features/chat/domain/mensagem';

function formatarData(valor, formatDate) {
  if (!valor) return '';
  return formatDate(valor, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ChatsPage() {
  const navigate = useNavigate();
  const { user, loading: loadingAuth } = useAuth();
  const { formatDate: formatLocalizedDate, t } = useLanguage();

  const { conversas, conversasVazias, errorMessage, loading } = useConversasAtivas({
    user, loadingAuth, t,
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.CREAM }}>
      <style>{`
        @media (max-width: 760px) {
          .chats-main {
            padding: ${SPACING.MD} !important;
          }

          .chats-header {
            align-items: flex-start !important;
            flex-direction: column !important;
          }

          .chat-row {
            align-items: stretch !important;
            flex-direction: column !important;
          }

          .chat-row button {
            width: 100%;
          }
        }
      `}</style>

      <Header />

      <main className="chats-main" style={{ padding: SPACING.XL }}>
        <div
          style={{
            maxWidth: 980,
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: SPACING.LG,
          }}
        >
          <section
            className="chats-header"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: SPACING.MD,
              backgroundColor: 'var(--bp-surface)',
              borderRadius: BORDER_RADIUS.LG,
              border: '1px solid rgba(123, 29, 46, 0.12)',
              boxShadow: SHADOWS.SM,
              padding: SPACING.XL,
            }}
          >
            <div>
              <h1
                style={{
                  color: COLORS.DARK_TEXT,
                  fontFamily: 'var(--font-serif)',
                  fontSize: '2rem',
                  lineHeight: 1.15,
                  margin: 0,
                }}
              >
                {t('Chats ativos')}
              </h1>
              <p style={{ color: 'var(--bp-text-muted)', lineHeight: 1.6, margin: `${SPACING.SM} 0 0` }}>
                {t('Conversas iniciadas com vendedores e compradores.')}
              </p>
            </div>

            <button type="button" onClick={() => navigate('/buscaPecas')} style={BUTTON_SECONDARY_STYLE}>
              {t('Ver pecas')}
            </button>
          </section>

          {loading && (
            <div style={{ color: COLORS.DARK_TEXT, fontWeight: 800 }}>
              {t('Carregando chats...')}
            </div>
          )}

          {errorMessage && (
            <div
              style={{
                backgroundColor: COLORS.ERROR,
                color: COLORS.ERROR_DARK,
                padding: SPACING.MD,
                borderRadius: BORDER_RADIUS.MD,
                border: `2px solid ${COLORS.ERROR_BORDER}`,
                overflowWrap: 'anywhere',
              }}
            >
              {errorMessage}
            </div>
          )}

          {conversasVazias && (
            <section
              style={{
                backgroundColor: 'var(--bp-surface)',
                borderRadius: BORDER_RADIUS.LG,
                border: '1px solid rgba(123, 29, 46, 0.12)',
                boxShadow: SHADOWS.SM,
                padding: SPACING.XL,
              }}
            >
              <strong style={{ color: COLORS.DARK_TEXT, fontSize: '1.1rem' }}>
                {t('Voce ainda nao tem chats ativos.')}
              </strong>
              <p style={{ color: 'var(--bp-text-muted)', lineHeight: 1.6, margin: `${SPACING.SM} 0 ${SPACING.LG}` }}>
                {t('Abra uma peca ou o perfil de um vendedor para iniciar uma conversa.')}
              </p>
              <button type="button" onClick={() => navigate('/buscaPecas')} style={BUTTON_PRIMARY_STYLE}>
                {t('Procurar pecas')}
              </button>
            </section>
          )}

          {!loading && conversas.length > 0 && (
            <section
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: SPACING.MD,
              }}
            >
              {conversas.map((conversa) => {
                const enviadaPorMim =
                  String(conversa.ultimaMensagem.id_remetente) === String(usuarioAtualIdMensagens);
                const nome = nomeParticipante(conversa.usuario);
                const preview = conversa.ultimaMensagem.mensagem || '';

                return (
                  <article
                    key={String(conversa.outroUsuarioId)}
                    className="chat-row"
                    style={{
                      backgroundColor: 'var(--bp-surface)',
                      borderRadius: BORDER_RADIUS.LG,
                      border: '1px solid rgba(123, 29, 46, 0.12)',
                      boxShadow: SHADOWS.SM,
                      padding: SPACING.LG,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: SPACING.LG,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => navigate(`/chat/${conversa.outroUsuarioId}`)}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        textAlign: 'left',
                        border: 'none',
                        backgroundColor: 'transparent',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: SPACING.MD,
                          marginBottom: 8,
                        }}
                      >
                        <strong
                          style={{
                            color: COLORS.DARK_TEXT,
                            fontSize: '1.05rem',
                            overflowWrap: 'anywhere',
                          }}
                        >
                          {nome}
                        </strong>
                        <span style={{ color: 'var(--bp-text-muted)', fontSize: '0.82rem', fontWeight: 800 }}>
                          {formatarData(conversa.ultimaMensagem.created_at, formatLocalizedDate)}
                        </span>
                      </div>

                      <div
                        style={{
                          color: 'var(--bp-text-muted)',
                          lineHeight: 1.5,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {enviadaPorMim ? t('Voce: ') : ''}
                        {preview}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate(`/chat/${conversa.outroUsuarioId}`)}
                      style={BUTTON_PRIMARY_STYLE}
                    >
                      {t('Abrir')}
                    </button>
                  </article>
                );
              })}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
