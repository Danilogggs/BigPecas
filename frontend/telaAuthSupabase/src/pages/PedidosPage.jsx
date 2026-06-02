import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../components/Header';
import { useOrders, ORDER_STATUS, STATUS_META } from '../contexts/OrderContext';

const BORDEAUX = '#7B1D2E';
const CREAM = '#F5EDD8';
const HIGHLIGHT = '#F0C060';
const DARK = '#2C1A17';
const MUTED = '#6A5F58';
const BORDER = '#E5DCC5';

const formatBRL = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function PedidosPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { orders, loadingOrders, ordersError, buscarPedido, atualizarStatusPedido, carregarPedidos } = useOrders();
  const [filtroStatus, setFiltroStatus] = useState('todos');

  const pedidoSelecionado = id ? buscarPedido(id) : null;

  const pedidosFiltrados = useMemo(() => {
    if (filtroStatus === 'todos') return orders;
    return orders.filter((p) => p.status === filtroStatus);
  }, [orders, filtroStatus]);

  if (pedidoSelecionado) {
    return (
      <DetalhePedido
        pedido={pedidoSelecionado}
        navigate={navigate}
        atualizarStatus={atualizarStatusPedido}
      />
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: CREAM }}>
      <Header />
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '2rem 1.5rem 4rem',
        }}
      >
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.8rem', color: MUTED, marginBottom: 6 }}>
            <span style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
              Início
            </span>{' '}
            › <span style={{ color: BORDEAUX, fontWeight: 600 }}>Meus Pedidos</span>
          </div>
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: 700,
              color: BORDEAUX,
              margin: 0,
              fontFamily: "'Georgia', serif",
            }}
          >
            Meus Pedidos
          </h1>
          <p style={{ color: MUTED, margin: '6px 0 0' }}>
            Acompanhe o status das suas compras de peças.
          </p>
        </div>

        {/* Filtros */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
          }}
        >
          <ChipFiltro
            label="Todos"
            ativo={filtroStatus === 'todos'}
            count={orders.length}
            onClick={() => setFiltroStatus('todos')}
          />
          {Object.entries(STATUS_META)
            .filter(([k]) => k !== ORDER_STATUS.CANCELADO)
            .sort(([, a], [, b]) => a.ordem - b.ordem)
            .map(([key, meta]) => (
              <ChipFiltro
                key={key}
                label={meta.label}
                icone={meta.icone}
                ativo={filtroStatus === key}
                count={orders.filter((p) => p.status === key).length}
                onClick={() => setFiltroStatus(key)}
                cor={meta.color}
                bg={meta.bg}
              />
            ))}
        </div>

        {loadingOrders && (
          <div style={{ color: MUTED, fontWeight: 600, padding: '1rem 0' }}>
            Carregando pedidos...
          </div>
        )}

        {ordersError && !loadingOrders && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#FEE2E2',
              color: '#7F1D1D',
              border: '1px solid #FCA5A5',
              borderRadius: 10,
              marginBottom: '1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span>{ordersError}</span>
            <button
              onClick={carregarPedidos}
              style={{
                background: 'none',
                border: 'none',
                color: '#7F1D1D',
                cursor: 'pointer',
                fontWeight: 700,
                textDecoration: 'underline',
                fontSize: '0.85rem',
              }}
            >
              Tentar novamente
            </button>
          </div>
        )}

        {!loadingOrders && !ordersError && pedidosFiltrados.length === 0 ? (
          <EmptyState navigate={navigate} todos={orders.length === 0} />
        ) : !loadingOrders && !ordersError ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {pedidosFiltrados.map((pedido) => (
              <PedidoCard
                key={pedido.id}
                pedido={pedido}
                onClick={() => navigate(`/pedidos/${pedido.id}`)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ChipFiltro({ label, icone, ativo, count, onClick, cor, bg }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 14px',
        borderRadius: 999,
        border: `1.5px solid ${ativo ? BORDEAUX : BORDER}`,
        backgroundColor: ativo ? BORDEAUX : '#fff',
        color: ativo ? CREAM : DARK,
        cursor: 'pointer',
        fontSize: '0.85rem',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        transition: 'all 0.18s',
      }}
    >
      {icone && <span>{icone}</span>}
      {label}
      <span
        style={{
          backgroundColor: ativo ? 'rgba(255,255,255,0.2)' : bg || `${BORDEAUX}15`,
          color: ativo ? CREAM : cor || BORDEAUX,
          borderRadius: 999,
          padding: '2px 8px',
          fontSize: '0.75rem',
          fontWeight: 700,
        }}
      >
        {count}
      </span>
    </button>
  );
}

function PedidoCard({ pedido, onClick }) {
  const meta = STATUS_META[pedido.status];

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: '1.25rem 1.5rem',
        border: `1px solid ${BORDER}`,
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: '1rem',
        alignItems: 'center',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = HIGHLIGHT;
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 6px 18px rgba(123,29,46,0.10)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = BORDER;
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: 999,
              backgroundColor: meta.bg,
              color: meta.color,
              border: `1px solid ${meta.border}`,
              fontSize: '0.75rem',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span>{meta.icone}</span>
            {meta.label}
          </span>
          <span style={{ fontSize: '0.78rem', color: MUTED }}>
            Pedido #{pedido.id}
          </span>
        </div>

        <div
          style={{
            fontSize: '0.95rem',
            color: DARK,
            fontWeight: 600,
            marginBottom: 4,
          }}
        >
          {pedido.itens.length} {pedido.itens.length === 1 ? 'item' : 'itens'} —{' '}
          {pedido.itens
            .slice(0, 2)
            .map((it) => it.nome)
            .join(', ')}
          {pedido.itens.length > 2 && `, +${pedido.itens.length - 2}`}
        </div>

        <div style={{ fontSize: '0.82rem', color: MUTED }}>
          Realizado em {formatDate(pedido.criadoEm)} • Rastreio:{' '}
          <strong style={{ color: DARK }}>{pedido.codigoRastreio}</strong>
        </div>
      </div>

      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: '0.78rem', color: MUTED }}>Total</div>
        <div
          style={{
            fontSize: '1.3rem',
            fontWeight: 700,
            color: BORDEAUX,
          }}
        >
          {formatBRL(pedido.total)}
        </div>
        <div style={{ fontSize: '0.78rem', color: MUTED, marginTop: 4 }}>
          {pedido.forma_pagamento?.nome || '—'}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ navigate, todos }) {
  return (
    <div
      style={{
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: '4rem 2rem',
        textAlign: 'center',
        border: `1px solid ${BORDER}`,
      }}
    >
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: '50%',
          backgroundColor: CREAM,
          margin: '0 auto 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2.5rem',
        }}
      >
        📋
      </div>
      <h2
        style={{
          color: BORDEAUX,
          fontSize: '1.4rem',
          margin: '0 0 8px',
          fontFamily: "'Georgia', serif",
        }}
      >
        {todos ? 'Você ainda não fez nenhum pedido' : 'Nenhum pedido neste status'}
      </h2>
      <p style={{ color: MUTED, marginBottom: '1.5rem' }}>
        {todos
          ? 'Explore o catálogo e faça sua primeira compra.'
          : 'Tente outro filtro ou explore o catálogo.'}
      </p>
      <button
        onClick={() => navigate('/buscaPecas')}
        style={{
          backgroundColor: BORDEAUX,
          color: CREAM,
          padding: '12px 28px',
          borderRadius: 10,
          border: 'none',
          fontSize: '1rem',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Explorar Peças
      </button>
    </div>
  );
}

function DetalhePedido({ pedido, navigate, atualizarStatus }) {
  const [atualizando, setAtualizando] = useState(false);
  const [erroStatus, setErroStatus] = useState('');

  const meta = STATUS_META[pedido.status];
  const statusOrder = [
    ORDER_STATUS.AGUARDANDO_PAGAMENTO,
    ORDER_STATUS.PAGO,
    ORDER_STATUS.ENVIADO,
    ORDER_STATUS.ENTREGUE,
  ];
  const stepAtual = statusOrder.indexOf(pedido.status);

  const proximoStatus =
    stepAtual >= 0 && stepAtual < statusOrder.length - 1
      ? statusOrder[stepAtual + 1]
      : null;

  const handleAvancarStatus = async () => {
    if (!proximoStatus || atualizando) return;
    setAtualizando(true);
    setErroStatus('');
    try {
      await atualizarStatus(pedido.id, proximoStatus);
    } catch (error) {
      setErroStatus(error?.message || 'Não foi possível atualizar o status.');
    } finally {
      setAtualizando(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: CREAM }}>
      <style>{`
        @media (max-width: 980px) {
          .detalhe-grid { grid-template-columns: 1fr !important; }
          .timeline { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
          .timeline .step-line { display: none !important; }
        }
      `}</style>
      <Header />
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '2rem 1.5rem 4rem',
        }}
      >
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.8rem', color: MUTED, marginBottom: 6 }}>
            <span style={{ cursor: 'pointer' }} onClick={() => navigate('/pedidos')}>
              Meus Pedidos
            </span>{' '}
            ›{' '}
            <span style={{ color: BORDEAUX, fontWeight: 600 }}>
              Pedido #{pedido.id}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: '1.8rem',
                  fontWeight: 700,
                  color: BORDEAUX,
                  margin: 0,
                  fontFamily: "'Georgia', serif",
                }}
              >
                Pedido #{pedido.id}
              </h1>
              <p style={{ color: MUTED, margin: '4px 0 0' }}>
                Realizado em {formatDate(pedido.criadoEm)}
              </p>
            </div>
            <span
              style={{
                padding: '8px 16px',
                borderRadius: 999,
                backgroundColor: meta.bg,
                color: meta.color,
                border: `1.5px solid ${meta.border}`,
                fontSize: '0.9rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>{meta.icone}</span>
              {meta.label}
            </span>
          </div>
        </div>

        {/* Timeline status */}
        <section
          style={{
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: '1.5rem',
            border: `1px solid ${BORDER}`,
            marginBottom: '1.5rem',
          }}
        >
          <div
            className="timeline"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            {statusOrder.map((status, i) => {
              const m = STATUS_META[status];
              const ativo = i <= stepAtual;
              const evento = pedido.historico.find((h) => h.status === status);
              return (
                <div
                  key={status}
                  style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                      flex: 1,
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        backgroundColor: ativo ? m.color : '#F2EAD3',
                        color: ativo ? CREAM : MUTED,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        flexShrink: 0,
                        transition: 'all 0.3s',
                      }}
                    >
                      {ativo ? '✓' : m.icone}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div
                        style={{
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          color: ativo ? DARK : MUTED,
                        }}
                      >
                        {m.label}
                      </div>
                      {evento && (
                        <div
                          style={{
                            fontSize: '0.7rem',
                            color: MUTED,
                            marginTop: 2,
                          }}
                        >
                          {formatDate(evento.data)}
                        </div>
                      )}
                    </div>
                  </div>
                  {i < statusOrder.length - 1 && (
                    <div
                      className="step-line"
                      style={{
                        flex: 1,
                        height: 3,
                        backgroundColor: i < stepAtual ? m.color : '#F2EAD3',
                        margin: '-30px 4px 0',
                        borderRadius: 2,
                        transition: 'all 0.3s',
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {erroStatus && (
            <div style={{ marginTop: 12, padding: '10px 14px', backgroundColor: '#FEE2E2', color: '#7F1D1D', border: '1px solid #FCA5A5', borderRadius: 8, fontSize: '0.85rem' }}>
              {erroStatus}
            </div>
          )}

          {proximoStatus && (
            <div
              style={{
                marginTop: '1.5rem',
                padding: '1rem 1.25rem',
                backgroundColor: `${HIGHLIGHT}22`,
                border: `1px solid ${HIGHLIGHT}`,
                borderRadius: 10,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, color: DARK }}>
                  Simulação de Status (Demo)
                </div>
                <div style={{ fontSize: '0.85rem', color: MUTED, marginTop: 2 }}>
                  Avance o status para visualizar o fluxo do pedido.
                </div>
              </div>
              <button
                onClick={handleAvancarStatus}
                disabled={atualizando}
                style={{
                  padding: '10px 20px',
                  backgroundColor: atualizando ? MUTED : BORDEAUX,
                  color: CREAM,
                  border: 'none',
                  borderRadius: 10,
                  fontWeight: 600,
                  cursor: atualizando ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem',
                }}
              >
                {atualizando ? 'Atualizando...' : `Marcar como ${STATUS_META[proximoStatus].label} →`}
              </button>
            </div>
          )}
        </section>

        <div
          className="detalhe-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 380px',
            gap: '1.5rem',
            alignItems: 'start',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Itens */}
            <Card title={`Itens do Pedido (${pedido.itens.length})`}>
              {pedido.itens.map((item, i) => (
                <div
                  key={item.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '64px 1fr auto',
                    gap: 14,
                    alignItems: 'center',
                    padding: '12px 0',
                    borderBottom: i < pedido.itens.length - 1 ? `1px solid ${BORDER}` : 'none',
                  }}
                >
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 10,
                      backgroundColor: '#F2EAD3',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}
                  >
                    {item.imagem ? (
                      <img
                        src={item.imagem}
                        alt={item.nome}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={{ fontSize: '1.5rem' }}>🔧</span>
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: DARK, fontSize: '0.95rem' }}>
                      {item.nome}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: MUTED, marginTop: 2 }}>
                      Quantidade: {item.quantidade} × {formatBRL(item.preco)}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, color: BORDEAUX, fontSize: '1rem' }}>
                    {formatBRL(Number(item.preco) * item.quantidade)}
                  </div>
                </div>
              ))}
            </Card>

            {/* Entrega */}
            <Card title="Endereço de Entrega">
              <div style={{ color: DARK, fontWeight: 600, marginBottom: 6 }}>
                {pedido.endereco?.nome}
              </div>
              <div style={{ color: MUTED, fontSize: '0.9rem', lineHeight: 1.6 }}>
                {pedido.endereco?.logradouro}, {pedido.endereco?.numero}
                {pedido.endereco?.complemento && ` - ${pedido.endereco.complemento}`}
                <br />
                {pedido.endereco?.bairro} - {pedido.endereco?.cidade}/
                {pedido.endereco?.uf}
                <br />
                CEP {pedido.endereco?.cep} • {pedido.endereco?.telefone}
              </div>
              <div
                style={{
                  marginTop: '1rem',
                  paddingTop: '1rem',
                  borderTop: `1px dashed ${BORDER}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: DARK }}>
                      {pedido.frete?.transportadora} — {pedido.frete?.tipo}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: MUTED }}>
                      {pedido.frete?.prazo_texto}
                    </div>
                  </div>
                  <div style={{ color: BORDEAUX, fontWeight: 700 }}>
                    {formatBRL(pedido.valorFrete)}
                  </div>
                </div>
                <div
                  style={{
                    marginTop: 10,
                    fontSize: '0.85rem',
                    color: MUTED,
                  }}
                >
                  Código de rastreio:{' '}
                  <strong style={{ color: DARK }}>{pedido.codigoRastreio}</strong>
                </div>
              </div>
            </Card>
          </div>

          {/* Resumo */}
          <Card title="Resumo Financeiro">
            <Linha label="Subtotal" valor={formatBRL(pedido.subtotal)} />
            {pedido.cupom && (
              <Linha
                label={`Cupom ${pedido.cupom.codigo}`}
                valor={`- ${formatBRL(pedido.desconto)}`}
                cor="#065F46"
              />
            )}
            <Linha
              label="Frete"
              valor={
                pedido.valorFrete === 0
                  ? 'Grátis'
                  : formatBRL(pedido.valorFrete)
              }
            />
            <div
              style={{
                marginTop: 14,
                paddingTop: 14,
                borderTop: `1.5px dashed ${BORDER}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
              }}
            >
              <div
                style={{
                  fontSize: '0.75rem',
                  color: MUTED,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  fontWeight: 700,
                }}
              >
                Total Pago
              </div>
              <div
                style={{
                  fontSize: '1.55rem',
                  fontWeight: 800,
                  color: BORDEAUX,
                  lineHeight: 1,
                }}
              >
                {formatBRL(pedido.total)}
              </div>
            </div>
            <div
              style={{
                marginTop: 14,
                padding: 12,
                backgroundColor: '#FAFAFA',
                border: `1px solid ${BORDER}`,
                borderRadius: 10,
              }}
            >
              <div style={{ fontSize: '0.78rem', color: MUTED, marginBottom: 4 }}>
                Forma de pagamento
              </div>
              <div style={{ fontWeight: 700, color: DARK }}>
                {pedido.forma_pagamento?.icone} {pedido.forma_pagamento?.nome}
              </div>
            </div>

            <button
              onClick={() => navigate('/buscaPecas')}
              style={{
                width: '100%',
                marginTop: 14,
                padding: '12px',
                backgroundColor: BORDEAUX,
                color: CREAM,
                border: 'none',
                borderRadius: 10,
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.95rem',
              }}
            >
              Comprar Novamente
            </button>
            <button
              onClick={() => navigate('/pedidos')}
              style={{
                width: '100%',
                marginTop: 8,
                padding: '12px',
                backgroundColor: 'transparent',
                color: BORDEAUX,
                border: `2px solid ${BORDEAUX}`,
                borderRadius: 10,
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.95rem',
              }}
            >
              Voltar aos Pedidos
            </button>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <section
      style={{
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: '1.5rem',
        border: `1px solid ${BORDER}`,
      }}
    >
      {title && (
        <h2
          style={{
            margin: '0 0 1rem',
            fontSize: '1.1rem',
            fontWeight: 700,
            color: BORDEAUX,
          }}
        >
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

function Linha({ label, valor, cor = DARK }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.92rem',
        marginBottom: 8,
      }}
    >
      <span style={{ color: MUTED }}>{label}</span>
      <span style={{ color: cor, fontWeight: 600 }}>{valor}</span>
    </div>
  );
}
