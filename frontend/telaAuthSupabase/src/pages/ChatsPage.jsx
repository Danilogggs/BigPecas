import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import {
  assinarMensagensUsuario,
  listarConversasAtivas,
} from '../services/mensagensService';
import { buscarPerfilUsuario, buscarUsuarioPorId } from '../services/usuarioService';
import {
  BORDER_RADIUS,
  BUTTON_PRIMARY_STYLE,
  BUTTON_SECONDARY_STYLE,
  COLORS,
  SHADOWS,
  SPACING,
} from '../styles/theme';
import { parseUnexpectedError } from '../utils/friendlyErrors';

function formatarData(valor) {
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

function getNomeUsuario(usuario) {
  return usuario?.nome_loja || usuario?.full_name || usuario?.nome || usuario?.email || 'Usuario';
}

export default function ChatsPage() {
  const navigate = useNavigate();
  const { user, loading: loadingAuth } = useAuth();

  const [perfilAtual, setPerfilAtual] = useState(null);
  const [conversas, setConversas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const usuarioAtualIdMensagens = perfilAtual?.id;

  const carregarConversas = useCallback(async () => {
    if (loadingAuth || !user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const perfilData = await buscarPerfilUsuario();
      const perfilNormalizado = perfilData?.profile || perfilData;
      setPerfilAtual(perfilNormalizado);

      if (!perfilNormalizado?.id) {
        setConversas([]);
        return;
      }

      const conversasData = await listarConversasAtivas(perfilNormalizado.id);
      const conversasComUsuarios = await Promise.all(
        conversasData.map(async (conversa) => {
          try {
            const usuarioData = await buscarUsuarioPorId(conversa.outroUsuarioId);
            return {
              ...conversa,
              usuario: usuarioData?.profile || usuarioData,
            };
          } catch (error) {
            console.error('Erro ao carregar usuario da conversa:', error);
            return {
              ...conversa,
              usuario: null,
            };
          }
        })
      );

      setConversas(conversasComUsuarios);
    } catch (error) {
      setErrorMessage(parseUnexpectedError(error, 'Nao foi possivel carregar seus chats agora.'));
    } finally {
      setLoading(false);
    }
  }, [loadingAuth, user?.id]);

  useEffect(() => {
    carregarConversas();
  }, [carregarConversas]);

  useEffect(() => {
    if (!usuarioAtualIdMensagens) return undefined;

    return assinarMensagensUsuario({
      usuarioAtualId: usuarioAtualIdMensagens,
      onNovaMensagem: () => {
        carregarConversas();
      },
    });
  }, [carregarConversas, usuarioAtualIdMensagens]);

  const conversasVazias = useMemo(() => {
    return !loading && !errorMessage && conversas.length === 0;
  }, [conversas.length, errorMessage, loading]);

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
                  fontFamily: "'Georgia', serif",
                  fontSize: '2rem',
                  lineHeight: 1.15,
                  margin: 0,
                }}
              >
                Chats ativos
              </h1>
              <p style={{ color: 'var(--bp-text-muted)', lineHeight: 1.6, margin: `${SPACING.SM} 0 0` }}>
                Conversas iniciadas com vendedores e compradores.
              </p>
            </div>

            <button type="button" onClick={() => navigate('/buscaPecas')} style={BUTTON_SECONDARY_STYLE}>
              Ver pecas
            </button>
          </section>

          {loading && (
            <div style={{ color: COLORS.DARK_TEXT, fontWeight: 800 }}>
              Carregando chats...
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
                Voce ainda nao tem chats ativos.
              </strong>
              <p style={{ color: 'var(--bp-text-muted)', lineHeight: 1.6, margin: `${SPACING.SM} 0 ${SPACING.LG}` }}>
                Abra uma peca ou o perfil de um vendedor para iniciar uma conversa.
              </p>
              <button type="button" onClick={() => navigate('/buscaPecas')} style={BUTTON_PRIMARY_STYLE}>
                Procurar pecas
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
                const nome = getNomeUsuario(conversa.usuario);
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
                          {formatarData(conversa.ultimaMensagem.created_at)}
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
                        {enviadaPorMim ? 'Voce: ' : ''}
                        {preview}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate(`/chat/${conversa.outroUsuarioId}`)}
                      style={BUTTON_PRIMARY_STYLE}
                    >
                      Abrir
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
