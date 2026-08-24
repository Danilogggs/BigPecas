import { useEffect, useState } from 'react';
import Header from '../components/Header';
import { listarNotificacoes, marcarNotificacaoComoLida } from '../services/notificacoesService';

const CREAM = '#EDE4CC';
const BORDER = '#CFC5A5';
const TEXT = '#1A2820';
const MUTED = '#6B7D6E';
const WHITE = '#fff';

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function NotificacoesPage() {
  const [notificacoes, setNotificacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const carregar = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await listarNotificacoes();
        if (active) setNotificacoes(data);
      } catch (err) {
        if (active) setError(err?.message || 'Não foi possível carregar suas notificações.');
      } finally {
        if (active) setLoading(false);
      }
    };

    carregar();
    return () => { active = false; };
  }, []);

  const marcarComoLida = async (id) => {
    try {
      await marcarNotificacaoComoLida(id);
      setNotificacoes((prev) =>
        prev.map((item) =>
          String(item.id) === String(id)
            ? { ...item, lida_em: new Date().toISOString() }
            : item,
        ),
      );
    } catch (err) {
      setError(err?.message || 'Não foi possível atualizar a notificação.');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: CREAM }}>
      <Header />

      <main style={{ maxWidth: 980, margin: '0 auto', padding: '2rem 1.5rem 4rem' }}>
        <h1 style={{ margin: '0 0 1.25rem', color: TEXT, fontSize: '2rem' }}>
          Notificações
        </h1>

        {loading && <Box>Carregando notificações...</Box>}
        {error && !loading && <Box danger>{error}</Box>}

        {!loading && !error && notificacoes.length === 0 && (
          <Box>Nenhuma notificação por enquanto.</Box>
        )}

        {!loading && !error && notificacoes.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {notificacoes.map((notificacao) => {
              const lida = Boolean(notificacao.lida_em);
              return (
                <article
                  key={notificacao.id}
                  style={{
                    background: lida ? 'rgba(255,255,255,.42)' : WHITE,
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
                      </p>
                    </div>

                    {!lida && (
                      <button
                        type="button"
                        onClick={() => marcarComoLida(notificacao.id)}
                        style={{
                          border: 0,
                          borderRadius: 10,
                          background: '#152218',
                          color: '#fff',
                          padding: '10px 12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          height: 'fit-content',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Marcar lida
                      </button>
                    )}
                  </div>

                  <div style={{ marginTop: 10, fontSize: '.78rem', color: MUTED }}>
                    {notificacao.lida_em ? `Lida em ${formatDate(notificacao.lida_em)}` : 'Não lida'}
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
        background: danger ? '#FEE2E2' : WHITE,
        color: danger ? '#7F1D1D' : TEXT,
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
