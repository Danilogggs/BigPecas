import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import {
  assinarMensagensConversa,
  enviarMensagem,
  listarMensagensConversa,
} from '../services/mensagensService';
import { buscarPerfilUsuario, buscarUsuarioPorId } from '../services/usuarioService';
import {
  BORDER_RADIUS,
  BUTTON_PRIMARY_STYLE,
  BUTTON_SECONDARY_STYLE,
  COLORS,
  INPUT_STYLE,
  SHADOWS,
  SPACING,
} from '../styles/theme';
import { parseUnexpectedError } from '../utils/friendlyErrors';

function formatarHorario(valor) {
  if (!valor) return '';

  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '';

  return data.toLocaleString('pt-BR', {
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
  const fimConversaRef = useRef(null);

  const [destinatario, setDestinatario] = useState(null);
  const [perfilAtual, setPerfilAtual] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState('');
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const nomeDestinatario = useMemo(() => {
    return destinatario?.nome_loja || destinatario?.full_name || destinatario?.nome || destinatario?.email || 'Usuario';
  }, [destinatario]);

  const destinatarioIdMensagens = destinatario?.id;
  const usuarioAtualIdMensagens = perfilAtual?.id;
  const conversaComigoMesmo =
    usuarioAtualIdMensagens &&
    destinatarioIdMensagens &&
    String(usuarioAtualIdMensagens) === String(destinatarioIdMensagens);

  useEffect(() => {
    async function carregarConversa() {
      if (loadingAuth || !user?.id || !id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage('');

      try {
        const [perfilAtualData, usuarioData] = await Promise.all([
          buscarPerfilUsuario(),
          buscarUsuarioPorId(id),
        ]);

        const perfilNormalizado = perfilAtualData?.profile || perfilAtualData;
        const destinatarioNormalizado = usuarioData?.profile || usuarioData;

        setPerfilAtual(perfilNormalizado);
        setDestinatario(destinatarioNormalizado);

        if (
          perfilNormalizado?.id &&
          destinatarioNormalizado?.id &&
          String(perfilNormalizado.id) !== String(destinatarioNormalizado.id)
        ) {
          const mensagensData = await listarMensagensConversa(perfilNormalizado.id, destinatarioNormalizado.id);
          setMensagens(Array.isArray(mensagensData) ? mensagensData : []);
          return;
        }

        setMensagens([]);
      } catch (error) {
        setErrorMessage(parseUnexpectedError(error, 'Nao foi possivel abrir esta conversa.'));
      } finally {
        setLoading(false);
      }
    }

    carregarConversa();
  }, [id, loadingAuth, user?.id]);

  useEffect(() => {
    if (!usuarioAtualIdMensagens || !destinatarioIdMensagens || conversaComigoMesmo) return undefined;

    return assinarMensagensConversa({
      usuarioAtualId: usuarioAtualIdMensagens,
      outroUsuarioId: destinatarioIdMensagens,
      onNovaMensagem: (novaMensagem) => {
        setMensagens((atuais) => {
          if (atuais.some((mensagem) => mensagem.id === novaMensagem.id)) {
            return atuais;
          }

          return [...atuais, novaMensagem].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        });
      },
    });
  }, [conversaComigoMesmo, destinatarioIdMensagens, usuarioAtualIdMensagens]);

  useEffect(() => {
    fimConversaRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens.length]);

  async function handleEnviarMensagem(event) {
    event.preventDefault();

    if (!usuarioAtualIdMensagens || !destinatarioIdMensagens || enviando) return;

    setEnviando(true);
    setErrorMessage('');

    try {
      const novaMensagem = await enviarMensagem({
        idRemetente: usuarioAtualIdMensagens,
        idDestinatario: destinatarioIdMensagens,
        mensagem: texto,
      });

      setMensagens((atuais) => {
        if (atuais.some((mensagem) => mensagem.id === novaMensagem.id)) {
          return atuais;
        }

        return [...atuais, novaMensagem];
      });
      setTexto('');
    } catch (error) {
      setErrorMessage(parseUnexpectedError(error, 'Nao foi possivel enviar sua mensagem agora.'));
    } finally {
      setEnviando(false);
    }
  }

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
                  Voltar
                </button>

                {!conversaComigoMesmo && (
                  <button type="button" onClick={() => navigate(`/vendedores/${id}`)} style={BUTTON_SECONDARY_STYLE}>
                    Ver vendedor
                  </button>
                )}
              </div>

              <h1 className="chat-title">{loading ? 'Carregando conversa...' : `Chat com ${nomeDestinatario}`}</h1>
            </div>
          </div>

          {conversaComigoMesmo ? (
            <div style={{ padding: SPACING.XL, color: COLORS.BORDEAUX, fontWeight: 800 }}>
              Voce nao pode abrir um chat com seu proprio usuario.
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
                {loading && <div style={{ color: COLORS.BORDEAUX, fontWeight: 800 }}>Carregando mensagens...</div>}

                {!loading && mensagens.length === 0 && (
                  <div style={{ color: 'var(--bp-text-muted)', fontWeight: 700 }}>
                    Ainda nao ha mensagens. Envie a primeira pergunta sobre uma peca.
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
                        {formatarHorario(mensagem.created_at)}
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
                  placeholder="Escreva sua mensagem..."
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
                  {enviando ? 'Enviando...' : 'Enviar'}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
