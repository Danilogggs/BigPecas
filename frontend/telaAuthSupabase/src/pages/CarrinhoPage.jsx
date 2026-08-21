import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useCart } from '../contexts/CartContext';
import { TrashIcon } from '../components/Icons';
import {
  calcularFrete,
  aplicarCupom,
  formatarCep,
  sanitizarCep,
  validarCep,
} from '../services/freteService';

const BORDEAUX = 'var(--bp-green-800)';
const CREAM = 'var(--bp-cream)';
const HIGHLIGHT = 'var(--bp-gold)';
const DARK = 'var(--bp-text)';
const MUTED = 'var(--bp-text-muted)';
const BORDER = 'var(--bp-border)';
const SUCCESS = 'var(--bp-success)';
const SUCCESS_BG = 'var(--bp-success-bg)';
const ERROR_BG = 'var(--bp-error-bg)';
const ERROR_FG = 'var(--bp-error)';

const formatBRL = (valor) =>
  Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

export default function CarrinhoPage() {
  const navigate = useNavigate();
  const { cartItems, removeFromCart, updateQuantity, getTotal } = useCart();

  const [cep, setCep] = useState('');
  const [cepError, setCepError] = useState('');
  const [calculando, setCalculando] = useState(false);
  const [freteResultado, setFreteResultado] = useState(null);
  const [opcaoSelecionada, setOpcaoSelecionada] = useState(null);

  const [codigoCupom, setCodigoCupom] = useState('');
  const [aplicandoCupom, setAplicandoCupom] = useState(false);
  const [cupomError, setCupomError] = useState('');
  const [cupomAtivo, setCupomAtivo] = useState(null);

  const subtotal = getTotal();

  const totais = useMemo(() => {
    let desconto = 0;
    let valorFrete = opcaoSelecionada?.valor || 0;

    if (cupomAtivo) {
      if (cupomAtivo.tipo === 'percentual') {
        desconto = subtotal * cupomAtivo.valor;
      } else if (cupomAtivo.tipo === 'frete_gratis') {
        desconto = valorFrete;
        valorFrete = 0;
      }
    }

    const total = Math.max(0, subtotal - desconto + valorFrete);

    return { desconto, valorFrete, total };
  }, [subtotal, opcaoSelecionada, cupomAtivo]);

  const handleCepChange = (e) => {
    setCep(formatarCep(e.target.value));
    if (cepError) setCepError('');
  };

  const handleCalcularFrete = async () => {
    setCepError('');

    if (!validarCep(cep)) {
      setCepError('Informe um CEP válido com 8 dígitos.');
      return;
    }

    if (cartItems.length === 0) {
      setCepError('Adicione itens ao carrinho antes de calcular.');
      return;
    }

    setCalculando(true);
    setFreteResultado(null);
    setOpcaoSelecionada(null);

    try {
      const resultado = await calcularFrete(sanitizarCep(cep), cartItems);
      setFreteResultado(resultado);
      if (resultado.opcoes?.length) {
        setOpcaoSelecionada(resultado.opcoes[0]);
      }
    } catch (error) {
      setCepError(error?.message || 'Não foi possível calcular o frete agora.');
    } finally {
      setCalculando(false);
    }
  };

  const handleAplicarCupom = async () => {
    setCupomError('');

    if (!codigoCupom.trim()) {
      setCupomError('Informe um código de cupom.');
      return;
    }

    setAplicandoCupom(true);
    try {
      const cupom = await aplicarCupom(codigoCupom, subtotal);
      setCupomAtivo(cupom);
      setCupomError('');
    } catch (error) {
      setCupomAtivo(null);
      setCupomError(error?.message || 'Cupom inválido.');
    } finally {
      setAplicandoCupom(false);
    }
  };

  const removerCupom = () => {
    setCupomAtivo(null);
    setCodigoCupom('');
    setCupomError('');
  };

  const handleQuantityChange = (itemId, newQuantity, maxEstoque) => {
    const parsed = parseInt(newQuantity, 10);
    if (Number.isNaN(parsed) || parsed < 1) return;
    updateQuantity(itemId, Math.min(parsed, maxEstoque), maxEstoque);
  };

  const handleIrParaCheckout = () => {
    if (cartItems.length === 0) return;
    if (!opcaoSelecionada) {
      setCepError('Selecione uma opção de frete antes de finalizar.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    navigate('/checkout', {
      state: {
        frete: opcaoSelecionada,
        freteResultado,
        cupom: cupomAtivo,
        cep: freteResultado?.cep,
      },
    });
  };

  const totalItens = cartItems.reduce((s, it) => s + it.quantidade, 0);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: CREAM }}>
      <style>{`
        @media (max-width: 980px) {
          .carrinho-grid { grid-template-columns: 1fr !important; }
          .carrinho-item { grid-template-columns: 96px 1fr !important; }
          .carrinho-item-controls { grid-column: 1 / -1 !important; display: flex !important; justify-content: space-between !important; align-items: center !important; padding-top: 12px !important; border-top: 1px dashed ${BORDER} !important; }
        }
        @media (max-width: 600px) {
          .frete-opcoes { grid-template-columns: 1fr !important; }
          .pagina-titulo { font-size: 1.5rem !important; }
        }
        .qty-btn {
          width: 32px; height: 32px;
          border: 1px solid ${BORDER};
          background: var(--bp-surface-muted); color: var(--bp-action-text);
          border-radius: 8px; cursor: pointer;
          font-weight: 700; font-size: 1rem;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.15s;
        }
        .qty-btn:hover { background: var(--bp-primary-action); color: var(--bp-on-primary); }
        .qty-btn:disabled { opacity: 0.4; cursor: not-allowed; background: #f5f5f5; color: ${MUTED}; }
        .frete-opcao {
          padding: 14px;
          border: 2px solid ${BORDER};
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.18s;
          background: var(--bp-surface-muted);
          display: flex; align-items: center; gap: 12px;
        }
        .frete-opcao:hover { border-color: ${HIGHLIGHT}; transform: translateY(-1px); }
        .frete-opcao.ativa { border-color: var(--bp-action-border); background: var(--bp-surface-muted); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .input-clean {
          width: 100%;
          padding: 12px 14px;
          border: 2px solid ${BORDER};
          border-radius: 10px;
          font-size: 0.95rem;
          background: var(--bp-surface-muted);
          color: ${DARK};
          outline: none;
          transition: border-color 0.18s;
          box-sizing: border-box;
        }
        .input-clean:focus { border-color: ${BORDEAUX}; }
        .spinner {
          width: 16px; height: 16px;
          border: 2px solid ${CREAM};
          border-top-color: ${BORDEAUX};
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          display: inline-block;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .skeleton-line {
          height: 18px;
          background: linear-gradient(90deg, #efe6cf, #f7efd9, #efe6cf);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
          border-radius: 6px;
        }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}</style>

      <Header />

      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '2rem 1.5rem 4rem',
        }}
      >
        {/* Breadcrumb + título */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.8rem', color: MUTED, marginBottom: 6 }}>
            <span
              style={{ cursor: 'pointer' }}
              onClick={() => navigate('/')}
            >
              Início
            </span>{' '}
            ›{' '}
            <span
              style={{ cursor: 'pointer' }}
              onClick={() => navigate('/buscaPecas')}
            >
              Peças
            </span>{' '}
            › <span style={{ color: 'var(--bp-action-text)', fontWeight: 600 }}>Carrinho</span>
          </div>
          <h1
            className="pagina-titulo"
            style={{
              fontSize: '2rem',
              fontWeight: 700,
              color: DARK,
              margin: 0,
              fontFamily: "'Playfair Display', Georgia, serif",
            }}
          >
            Meu Carrinho
          </h1>
          <p style={{ color: MUTED, margin: '6px 0 0', fontSize: '0.95rem' }}>
            {totalItens === 0
              ? 'Nenhum item adicionado ainda.'
              : `${totalItens} ${totalItens === 1 ? 'item' : 'itens'} no carrinho`}
          </p>
        </div>

        {cartItems.length === 0 ? (
          <EmptyCart navigate={navigate} />
        ) : (
          <div
            className="carrinho-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 400px',
              gap: '1.5rem',
              alignItems: 'start',
            }}
          >
            {/* COLUNA ESQUERDA */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Lista de itens */}
              <Card title="Itens do Pedido">
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {cartItems.map((item, index) => (
                    <CartItem
                      key={item.id}
                      item={item}
                      isLast={index === cartItems.length - 1}
                      onRemove={removeFromCart}
                      onChange={handleQuantityChange}
                      onClick={() => navigate(`/pecas/${item.id}`)}
                    />
                  ))}
                </div>

                <button
                  onClick={() => navigate('/buscaPecas')}
                  style={{
                    marginTop: '1.25rem',
                    padding: '0.85rem 1rem',
                    backgroundColor: 'transparent',
                    color: 'var(--bp-action-text)',
                    border: '2px dashed var(--bp-action-border)',
                    borderRadius: 12,
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    width: '100%',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = `${BORDEAUX}0d`;
                    e.currentTarget.style.borderStyle = 'solid';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.borderStyle = 'dashed';
                  }}
                >
                  + Adicionar mais peças
                </button>
              </Card>

              {/* Cálculo de frete */}
              <Card title="Cálculo de Frete" subtitle="Informe o CEP de entrega">
                <div
                  style={{
                    display: 'flex',
                    gap: 10,
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ flex: '1 1 220px' }}>
                    <input
                      className="input-clean"
                      type="text"
                      placeholder="00000-000"
                      value={cep}
                      onChange={handleCepChange}
                      maxLength={9}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCalcularFrete();
                      }}
                    />
                    <button
                      onClick={() =>
                        window.open(
                          'https://buscacepinter.correios.com.br/app/endereco/index.php',
                          '_blank',
                        )
                      }
                      style={{
                        marginTop: 6,
                        background: 'none',
                        border: 'none',
                        color: 'var(--bp-action-text)',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        padding: 0,
                        textDecoration: 'underline',
                      }}
                    >
                      Não sei meu CEP
                    </button>
                  </div>
                  <button
                    onClick={handleCalcularFrete}
                    disabled={calculando}
                    style={{
                      padding: '12px 22px',
                      backgroundColor: calculando ? MUTED : 'var(--bp-primary-action)',
                      color: 'var(--bp-on-primary)',
                      border: 'none',
                      borderRadius: 10,
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      cursor: calculando ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      minHeight: 46,
                    }}
                  >
                    {calculando ? (
                      <>
                        <span className="spinner" /> Calculando...
                      </>
                    ) : (
                      'Calcular Frete'
                    )}
                  </button>
                </div>

                {cepError && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: '10px 12px',
                      backgroundColor: ERROR_BG,
                      color: ERROR_FG,
                      borderRadius: 8,
                      fontSize: '0.85rem',
                      border: '1px solid #FCA5A5',
                    }}
                  >
                    {cepError}
                  </div>
                )}

                {calculando && (
                  <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="skeleton-line"
                        style={{ height: 56 }}
                      />
                    ))}
                  </div>
                )}

                {freteResultado && !calculando && (
                  <div style={{ marginTop: 18 }}>
                    <div
                      style={{
                        fontSize: '0.82rem',
                        color: MUTED,
                        marginBottom: 12,
                      }}
                    >
                      Entrega para{' '}
                      <strong style={{ color: DARK }}>
                        {freteResultado.cep}
                      </strong>
                    </div>

                    <div
                      className="frete-opcoes"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 10,
                      }}
                    >
                      {freteResultado.opcoes.map((opcao) => {
                        const ativa = opcaoSelecionada?.id === opcao.id;
                        return (
                          <div
                            key={opcao.id}
                            className={`frete-opcao ${ativa ? 'ativa' : ''}`}
                            onClick={() => setOpcaoSelecionada(opcao)}
                          >
                            <div
                              style={{
                                width: 38,
                                height: 38,
                                borderRadius: 10,
                                backgroundColor: ativa ? 'var(--bp-primary-action)' : 'var(--bp-surface-muted)',
                                color: ativa ? 'var(--bp-on-primary)' : 'var(--bp-action-text)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.1rem',
                                flexShrink: 0,
                              }}
                            >
                              {opcao.logo ? (
                                <img
                                  src={opcao.logo}
                                  alt={opcao.transportadora}
                                  style={{ width: 28, height: 28, objectFit: 'contain' }}
                                />
                              ) : (
                                <span style={{ fontSize: '1.1rem' }}>🚚</span>
                              )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  fontWeight: 700,
                                  color: DARK,
                                  fontSize: '0.92rem',
                                }}
                              >
                                {opcao.transportadora} — {opcao.tipo}
                              </div>
                              <div
                                style={{
                                  fontSize: '0.78rem',
                                  color: MUTED,
                                  marginTop: 2,
                                }}
                              >
                                {opcao.prazo_texto}
                              </div>
                              <div
                                style={{
                                  marginTop: 4,
                                  color: DARK,
                                  fontWeight: 700,
                                  fontSize: '0.95rem',
                                }}
                              >
                                {formatBRL(opcao.valor)}
                              </div>
                            </div>
                            <div
                              style={{
                                width: 18,
                                height: 18,
                                borderRadius: '50%',
                                border: `2px solid ${ativa ? 'var(--bp-action-border)' : BORDER}`,
                                backgroundColor: ativa ? 'var(--bp-primary-action)' : 'var(--bp-surface)',
                                flexShrink: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {ativa && (
                                <div
                                  style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    backgroundColor: 'var(--bp-on-primary)',
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Card>

              {/* Cupom */}
              <Card title="Cupom de Desconto" subtitle="Use BIGPECAS10, FRETE0 ou PRIMEIRA20">
                {!cupomAtivo ? (
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <input
                      className="input-clean"
                      type="text"
                      placeholder="Digite o código"
                      value={codigoCupom}
                      onChange={(e) => {
                        setCodigoCupom(e.target.value.toUpperCase());
                        if (cupomError) setCupomError('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAplicarCupom();
                      }}
                      style={{ flex: '1 1 200px' }}
                    />
                    <button
                      onClick={handleAplicarCupom}
                      disabled={aplicandoCupom}
                      style={{
                        padding: '12px 22px',
                        backgroundColor: HIGHLIGHT,
                        color: DARK,
                        border: 'none',
                        borderRadius: 10,
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        cursor: aplicandoCupom ? 'not-allowed' : 'pointer',
                        minHeight: 46,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      {aplicandoCupom ? (
                        <>
                          <span className="spinner" /> Aplicando...
                        </>
                      ) : (
                        'Aplicar'
                      )}
                    </button>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: 14,
                      backgroundColor: SUCCESS_BG,
                      border: '2px solid #6EE7B7',
                      borderRadius: 10,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontWeight: 700,
                          color: SUCCESS,
                          fontSize: '0.95rem',
                        }}
                      >
                        {cupomAtivo.codigo}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: SUCCESS }}>
                        {cupomAtivo.descricao}
                      </div>
                    </div>
                    <button
                      onClick={removerCupom}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: SUCCESS,
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        textDecoration: 'underline',
                        fontWeight: 600,
                      }}
                    >
                      Remover
                    </button>
                  </div>
                )}

                {cupomError && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: '10px 12px',
                      backgroundColor: ERROR_BG,
                      color: ERROR_FG,
                      borderRadius: 8,
                      fontSize: '0.85rem',
                      border: '1px solid #FCA5A5',
                    }}
                  >
                    {cupomError}
                  </div>
                )}
              </Card>
            </div>

            {/* COLUNA DIREITA - Resumo */}
            <div style={{ position: 'sticky', top: 20 }}>
              <Card title="Resumo Financeiro">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Linha
                    label={`Subtotal (${totalItens} ${
                      totalItens === 1 ? 'item' : 'itens'
                    })`}
                    valor={formatBRL(subtotal)}
                  />
                  <Linha
                    label="Desconto"
                    valor={
                      totais.desconto > 0
                        ? `- ${formatBRL(totais.desconto)}`
                        : formatBRL(0)
                    }
                    cor={totais.desconto > 0 ? SUCCESS : MUTED}
                  />
                  <Linha
                    label="Frete"
                    valor={
                      opcaoSelecionada
                        ? totais.valorFrete === 0 && cupomAtivo?.tipo === 'frete_gratis'
                          ? 'Grátis'
                          : formatBRL(totais.valorFrete)
                        : 'A calcular'
                    }
                    cor={
                      totais.valorFrete === 0 && opcaoSelecionada
                        ? SUCCESS
                        : DARK
                    }
                  />

                  {opcaoSelecionada && (
                    <div
                      style={{
                        marginTop: 4,
                        padding: '8px 10px',
                        backgroundColor: `${HIGHLIGHT}22`,
                        borderRadius: 8,
                        fontSize: '0.78rem',
                        color: DARK,
                      }}
                    >
                      <strong>{opcaoSelecionada.transportadora}</strong> —{' '}
                      {opcaoSelecionada.tipo}
                      <br />
                      {opcaoSelecionada.prazo_texto}
                    </div>
                  )}

                  <div
                    style={{
                      marginTop: 8,
                      paddingTop: 14,
                      borderTop: `1.5px dashed ${BORDER}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-end',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: MUTED,
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                        }}
                      >
                        Total
                      </div>
                      <div
                        style={{
                          fontSize: '1.7rem',
                          fontWeight: 800,
                          color: DARK,
                          lineHeight: 1,
                        }}
                      >
                        {formatBRL(totais.total)}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: '0.72rem',
                        color: MUTED,
                        textAlign: 'right',
                      }}
                    >
                      ou 12x de{' '}
                      <strong style={{ color: DARK }}>
                        {formatBRL(totais.total / 12)}
                      </strong>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleIrParaCheckout}
                  disabled={cartItems.length === 0}
                  style={{
                    width: '100%',
                    padding: '14px',
                    marginTop: 18,
                    backgroundColor: 'var(--bp-primary-action)',
                    color: 'var(--bp-on-primary)',
                    border: 'none',
                    borderRadius: 12,
                    fontSize: '1rem',
                    fontWeight: 700,
                    cursor: cartItems.length === 0 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    opacity: cartItems.length === 0 ? 0.5 : 1,
                    letterSpacing: 0.3,
                  }}
                  onMouseEnter={(e) => {
                    if (cartItems.length > 0)
                      e.currentTarget.style.backgroundColor = '#5e1622';
                  }}
                  onMouseLeave={(e) => {
                    if (cartItems.length > 0)
                      e.currentTarget.style.backgroundColor = BORDEAUX;
                  }}
                >
                  Finalizar Compra →
                </button>

                <div
                  style={{
                    marginTop: 14,
                    padding: '10px 12px',
                    backgroundColor: 'var(--bp-surface-muted)',
                    borderRadius: 8,
                    fontSize: '0.75rem',
                    color: MUTED,
                    textAlign: 'center',
                    border: `1px solid ${BORDER}`,
                  }}
                >
                  🔒 Pagamento 100% seguro • Compra protegida
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ title, subtitle, children }) {
  return (
    <section
      style={{
        backgroundColor: 'var(--bp-surface)',
        borderRadius: 16,
        padding: '1.5rem',
        border: `1px solid ${BORDER}`,
        boxShadow: '0 2px 12px rgba(123,29,46,0.05)',
      }}
    >
      {(title || subtitle) && (
        <div style={{ marginBottom: '1.1rem' }}>
          {title && (
            <h2
              style={{
                margin: 0,
                fontSize: '1.1rem',
                fontWeight: 700,
                color: DARK,
              }}
            >
              {title}
            </h2>
          )}
          {subtitle && (
            <p style={{ margin: '4px 0 0', color: MUTED, fontSize: '0.85rem' }}>
              {subtitle}
            </p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

function Linha({ label, valor, cor = DARK }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem' }}>
      <span style={{ color: MUTED }}>{label}</span>
      <span style={{ color: cor, fontWeight: 600 }}>{valor}</span>
    </div>
  );
}

function CartItem({ item, isLast, onRemove, onChange, onClick }) {
  const subtotal = Number(item.preco) * item.quantidade;

  return (
    <div
      className="carrinho-item"
      style={{
        display: 'grid',
        gridTemplateColumns: '96px 1fr auto auto',
        gap: '1rem',
        alignItems: 'center',
        padding: '14px 0',
        borderBottom: isLast ? 'none' : `1px solid ${BORDER}`,
      }}
    >
      {/* Imagem */}
      <div
        onClick={onClick}
        style={{
          width: 96,
          height: 96,
          borderRadius: 12,
          backgroundColor: 'var(--bp-surface-muted)',
          overflow: 'hidden',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {item.imagem ? (
          <img
            src={item.imagem}
            alt={item.nome}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span style={{ fontSize: '1.8rem' }}>🔧</span>
        )}
      </div>

      {/* Info */}
      <div style={{ minWidth: 0 }}>
        <h3
          onClick={onClick}
          style={{
            margin: 0,
            fontSize: '0.98rem',
            fontWeight: 700,
            color: DARK,
            cursor: 'pointer',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {item.nome}
        </h3>
        <p style={{ margin: '4px 0 6px', fontSize: '0.78rem', color: MUTED }}>
          {item.descricao
            ? String(item.descricao).slice(0, 80)
            : item.sku
            ? `SKU: ${item.sku}`
            : 'Peça automotiva'}
        </p>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 8px',
            backgroundColor:
              Number(item.estoque) > 0 ? SUCCESS_BG : ERROR_BG,
            color: Number(item.estoque) > 0 ? SUCCESS : ERROR_FG,
            borderRadius: 999,
            fontSize: '0.72rem',
            fontWeight: 600,
          }}
        >
          {Number(item.estoque) > 0
            ? `${item.estoque} em estoque`
            : 'Sem estoque'}
        </div>
      </div>

      {/* Quantidade + preço */}
      <div
        className="carrinho-item-controls"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 10,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            backgroundColor: 'var(--bp-surface-muted)',
            border: `1px solid ${BORDER}`,
            borderRadius: 10,
            padding: 4,
          }}
        >
          <button
            className="qty-btn"
            disabled={item.quantidade <= 1}
            onClick={() => onChange(item.id, item.quantidade - 1, item.estoque)}
          >
            −
          </button>
          <input
            type="number"
            min="1"
            max={item.estoque}
            value={item.quantidade}
            onChange={(e) => onChange(item.id, e.target.value, item.estoque)}
            style={{
              width: 38,
              border: 'none',
              backgroundColor: 'transparent',
              textAlign: 'center',
              fontWeight: 700,
              color: DARK,
              fontSize: '0.92rem',
              outline: 'none',
              MozAppearance: 'textfield',
            }}
          />
          <button
            className="qty-btn"
            disabled={item.quantidade >= item.estoque}
            onClick={() => onChange(item.id, item.quantidade + 1, item.estoque)}
          >
            +
          </button>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.72rem', color: MUTED }}>
            {formatBRL(item.preco)} × {item.quantidade}
          </div>
          <div
            style={{
              fontSize: '1.05rem',
              fontWeight: 700,
              color: DARK,
            }}
          >
            {formatBRL(subtotal)}
          </div>
        </div>
      </div>

      {/* Remover */}
      <button
        onClick={() => onRemove(item.id)}
        title="Remover item"
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: 'transparent',
          color: ERROR_FG,
          border: `1px solid ${BORDER}`,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.18s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = ERROR_BG;
          e.currentTarget.style.borderColor = '#FCA5A5';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.borderColor = BORDER;
        }}
      >
        <TrashIcon size={16} />
      </button>
    </div>
  );
}

function EmptyCart({ navigate }) {
  return (
    <div
      style={{
        backgroundColor: 'var(--bp-surface)',
        borderRadius: 16,
        padding: '4rem 2rem',
        textAlign: 'center',
        border: `1px solid ${BORDER}`,
        boxShadow: '0 2px 12px rgba(123,29,46,0.05)',
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
        🛒
      </div>
      <h2
        style={{
          color: DARK,
          fontSize: '1.4rem',
          margin: '0 0 8px',
          fontFamily: "'Playfair Display', Georgia, serif",
        }}
      >
        Seu carrinho está vazio
      </h2>
      <p style={{ color: MUTED, marginBottom: '1.5rem' }}>
        Explore nosso catálogo e adicione peças automotivas ao carrinho.
      </p>
      <button
        onClick={() => navigate('/buscaPecas')}
        style={{
          backgroundColor: 'var(--bp-primary-action)',
          color: 'var(--bp-on-primary)',
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
