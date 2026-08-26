import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import {
  BORDER_RADIUS,
  BUTTON_PRIMARY_STYLE,
  BUTTON_SECONDARY_STYLE,
  COLORS,
  INPUT_STYLE,
  SHADOWS,
  SPACING,
} from '../styles/theme';
import { useLanguage } from '../contexts/LanguageContext';
import useConversa from '../features/chat/application/useConversa';

function formatarHorario(valor, formatDate) {
  if (!valor) return '';
  return formatDate(valor, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ChatPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: loadingAuth } = useAuth();
  const { formatDate, t } = useLanguage();
  const fimConversaRef = useRef(null);

  const {
    conversaComigoMesmo,
    destinatario,
    destinatarioIdMensagens,
    enviando,
    errorMessage,
    handleEnviarMensagem,
    loading,
    mensagens,
    nomeDestinatario,
    perfilAtual,
    setTexto,
    texto,
    usuarioAtualIdMensagens,
  } = useConversa({ id, user, loadingAuth, t });

  useEffect(() => {
    fimConversaRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens.length]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.CREAM }}>
      <style>{`
        .chat-page-main {
          padding: ${SPACING.XL};
        }

        .chat-header-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: ${SPACING.MD};
          width: 100%;
        }

        .chat-title {
          color: ${COLORS.BORDEAUX};
          font-family: 'Georgia', serif;
          font-size: 1.7rem;
          line-height: 1.2;
          margin: ${SPACING.MD} 0 0;
          overflow-wrap: anywhere;
        }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: ${SPACING.LG};
          background-color: #FAF4E8;
          display: flex;
          flex-direction: column;
          gap: ${SPACING.SM};
        }

        .chat-message-bubble {
          max-width: min(78%, 560px);
        }

        .chat-form {
          padding: ${SPACING.LG};
          border-top: 1px solid #F0E1C8;
          display: flex;
          gap: ${SPACING.MD};
          align-items: flex-end;
        }

        .chat-error {
          margin: ${SPACING.LG};
        }

        @media (max-width: 720px) {
          .chat-page-main {
            padding: 0;
          }

          .chat-shell {
            width: 100% !important;
            height: calc(100dvh - 76px) !important;
            margin: 0 !important;
            border-left: none !important;
            border-right: none !important;
            border-bottom: none !important;
            border-radius: 0 !important;
          }

          .chat-header {
            align-items: flex-start !important;
            flex-direction: column !important;
            padding: ${SPACING.MD} !important;
          }

          .chat-header-actions {
            align-items: stretch;
            gap: ${SPACING.SM};
          }

          .chat-header-actions button {
            flex: 1;
            min-height: 44px;
            padding-left: ${SPACING.SM} !important;
            padding-right: ${SPACING.SM} !important;
          }

          .chat-title {
            font-size: 1.35rem;
          }

          .chat-messages {
            padding: ${SPACING.MD};
          }

          .chat-error {
            margin: ${SPACING.MD};
            overflow-wrap: anywhere;
          }

          .chat-message-bubble {
            max-width: 88%;
          }

          .chat-form {
            padding: ${SPACING.MD};
            gap: ${SPACING.SM};
          }

          .chat-form textarea {
            min-height: 48px !important;
          }
        }

        @media (max-width: 460px) {
          .chat-header-actions {
            flex-direction: column;
          }

          .chat-message-bubble {
            max-width: 94%;
          }

          .chat-form {
            align-items: stretch;
            flex-direction: column;
          }

          .chat-form button {
            width: 100%;
            min-height: 48px !important;
          }
        }
      `}</style>

      <Header />

      <main className="chat-page-main">
        <div
          className="chat-shell"
          style={{
            maxWidth: 920,
            height: 'calc(100vh - 150px)',
            margin: '0 auto',
            backgroundColor: 'var(--bp-surface)',
            borderRadius: BORDER_RADIUS.LG,
            border: '1px solid rgba(123, 29, 46, 0.12)',
            boxShadow: SHADOWS.SM,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            className="chat-header"
            style={{
              padding: SPACING.LG,
              borderBottom: '1px solid #F0E1C8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: SPACING.MD,
            }}
          >
            <div style={{ width: '100%' }}>
              <div className="chat-header-actions">
                <button type="button" onClick={() => navigate(-1)} style={BUTTON_SECONDARY_STYLE}>
                  {t('Voltar')}
                </button>

                {!conversaComigoMesmo && (
                  <button type="button" onClick={() => navigate(`/vendedores/${id}`)} style={BUTTON_SECONDARY_STYLE}>
                    {t('Ver vendedor')}
                  </button>
                )}
              </div>

              <h1 className="chat-title">{loading ? t('Carregando conversa...') : `${t('Chat com')} ${nomeDestinatario}`}</h1>
            </div>
          </div>

          {conversaComigoMesmo ? (
            <div style={{ padding: SPACING.XL, color: COLORS.BORDEAUX, fontWeight: 800 }}>
              {t('Voce nao pode abrir um chat com seu proprio usuario.')}
            </div>
          ) : (
            <>
              {errorMessage && (
                <div
                  className="chat-error"
                  style={{
                    backgroundColor: COLORS.ERROR,
                    color: COLORS.ERROR_DARK,
                    padding: SPACING.MD,
                    borderRadius: BORDER_RADIUS.MD,
                    border: `2px solid ${COLORS.ERROR_BORDER}`,
                  }}
                >
                  {errorMessage}
                </div>
              )}

              <div className="chat-messages">
                {loading && <div style={{ color: COLORS.BORDEAUX, fontWeight: 800 }}>{t('Carregando mensagens...')}</div>}

                {!loading && mensagens.length === 0 && (
                  <div style={{ color: 'var(--bp-text-muted)', fontWeight: 700 }}>
                    {t('Ainda nao ha mensagens. Envie a primeira pergunta sobre uma peca.')}
                  </div>
                )}

                {mensagens.map((mensagem) => {
                  const enviadaPorMim = String(mensagem.id_remetente) === String(usuarioAtualIdMensagens);

                  return (
                    <div
                      key={mensagem.id}
                      className="chat-message-bubble"
                      style={{
                        alignSelf: enviadaPorMim ? 'flex-end' : 'flex-start',
                        backgroundColor: enviadaPorMim ? COLORS.BORDEAUX : '#fff',
                        color: enviadaPorMim ? '#fff' : COLORS.DARK_TEXT,
                        border: enviadaPorMim ? 'none' : '1px solid #EAD8BE',
                        borderRadius: BORDER_RADIUS.MD,
                        padding: SPACING.MD,
                        boxShadow: '0 1px 5px rgba(0,0,0,0.06)',
                        overflowWrap: 'anywhere',
                      }}
                    >
                      <div style={{ lineHeight: 1.5 }}>{mensagem.mensagem}</div>
                      <div
                        style={{
                          marginTop: 6,
                          fontSize: '0.75rem',
                          opacity: 0.75,
                          textAlign: 'right',
                          fontWeight: 700,
                        }}
                      >
                        {formatarHorario(mensagem.created_at, formatDate)}
                      </div>
                    </div>
                  );
                })}

                <div ref={fimConversaRef} />
              </div>

              <form
                className="chat-form"
                onSubmit={handleEnviarMensagem}
              >
                <textarea
                  value={texto}
                  onChange={(event) => setTexto(event.target.value)}
                  placeholder={t('Escreva sua mensagem...')}
                  rows={2}
                  disabled={loading || enviando}
                  style={{
                    ...INPUT_STYLE,
                    minHeight: 54,
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />

                <button
                  type="submit"
                  disabled={loading || enviando || !texto.trim()}
                  style={{
                    ...BUTTON_PRIMARY_STYLE,
                    minHeight: 54,
                    opacity: loading || enviando || !texto.trim() ? 0.65 : 1,
                    cursor: loading || enviando || !texto.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  {enviando ? t('Enviando...') : t('Enviar')}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
