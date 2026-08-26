import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useCart } from '../contexts/CartContext';
import { useOrders } from '../contexts/OrderContext';
import { formatarCep, validarCep, sanitizarCep } from '../services/freteService';
import { useLanguage } from '../contexts/LanguageContext';
import {
  FORMAS_PAGAMENTO,
  calcularTotaisCompra,
  contarItensCarrinho,
  criarErrosCartao,
  criarErrosEndereco,
  formatarNumeroCartao,
  formatarValidadeCartao as formatarValidade,
} from '../features/carrinho/domain/carrinho';
import { formatarMoedaCarrinho as formatBRL } from '../features/carrinho/presentation/carrinhoPresentation';

const BORDEAUX = 'var(--bp-green-800)';
const CREAM = 'var(--bp-cream)';
const HIGHLIGHT = 'var(--bp-gold)';
const DARK = 'var(--bp-text)';
const MUTED = 'var(--bp-text-muted)';
const BORDER = 'var(--bp-border)';
const ERROR_BG = 'var(--bp-error-bg)';
const ERROR_FG = 'var(--bp-error)';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartItems, getTotal, clearCart } = useCart();
  const { criarPedido, confirmarPagamentoPedido } = useOrders();
  const { t } = useLanguage();

  const dadosCarrinho = location.state || {};

  const [etapa, setEtapa] = useState(1);

  const [endereco, setEndereco] = useState({
    nome: '',
    cep: dadosCarrinho.cep || '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    telefone: '',
  });

  const [pagamento, setPagamento] = useState('pix');

  const [dadosCartao, setDadosCartao] = useState({
    numero: '',
    nome: '',
    validade: '',
    cvv: '',
    parcelas: 1,
  });

  const [processando, setProcessando] = useState(false);
  const [erroFinal, setErroFinal] = useState('');
  const [errors, setErrors] = useState({});
  const [pedidoPendente, setPedidoPendente] = useState(null);
  const [pedidoConcluido, setPedidoConcluido] = useState(null);

  const subtotal = getTotal();
  const cupom = dadosCarrinho.cupom;
  const frete = dadosCarrinho.frete;

  const totais = useMemo(() => calcularTotaisCompra({
    subtotal,
    frete,
    cupom,
    formaPagamento: FORMAS_PAGAMENTO.find((forma) => forma.id === pagamento),
  }), [subtotal, cupom, frete, pagamento]);

  const validarEnderecoStep = () => {
    const newErrors = criarErrosEndereco(endereco, {
      nome: t('recipientName'),
      cep: t('cepRequired'),
      logradouro: t('address'),
      numero: t('number'),
      bairro: t('neighborhood'),
      cidade: t('city'),
      telefone: t('phone'),
      validarCep,
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validarPagamentoStep = () => {
    if (pagamento !== 'cartao') return true;

    const newErrors = criarErrosCartao(dadosCartao, {
      numero: t('cardNumber'),
      nome: t('printedName'),
      validade: t('expiry'),
      cvv: t('cardCvvPlaceholder'),
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const proximaEtapa = () => {
    setErrors({});
    if (etapa === 1 && !validarEnderecoStep()) return;
    if (etapa === 2 && !validarPagamentoStep()) return;
    setEtapa(etapa + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const finalizar = async () => {
    if (!validarPagamentoStep()) return;
    setProcessando(true);
    setErroFinal('');

    try {
      let pedido = pedidoPendente;

      if (!pedido) {
        pedido = await criarPedido({
          itens: cartItems,
          frete,
          cupom,
          endereco: {
            ...endereco,
            cep: formatarCep(endereco.cep),
          },
          formaPagamento: FORMAS_PAGAMENTO.find((f) => f.id === pagamento),
        });
        setPedidoPendente(pedido);
      }

      const pedidoPago = await confirmarPagamentoPedido(pedido.id);

      setPedidoConcluido(pedidoPago);
      clearCart();
      setEtapa(4);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      setErroFinal(error?.message || t('orderCompletionFailed'));
    } finally {
      setProcessando(false);
    }
  };

  if (cartItems.length === 0 && !pedidoConcluido) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: CREAM }}>
        <Header />
        <div
          style={{
            maxWidth: 600,
            margin: '4rem auto',
            background: 'var(--bp-surface)',
            borderRadius: 16,
            padding: '3rem 2rem',
            textAlign: 'center',
            border: `1px solid ${BORDER}`,
          }}
        >
          <h2 style={{ color: BORDEAUX, marginTop: 0 }}>
            {t('Carrinho vazio')}
          </h2>
          <p style={{ color: MUTED }}>
            {t('Adicione peças ao carrinho antes de finalizar a compra.')}
          </p>
          <button
            onClick={() => navigate('/buscaPecas')}
            style={{
              backgroundColor: BORDEAUX,
              color: CREAM,
              padding: '12px 28px',
              border: 'none',
              borderRadius: 10,
              fontWeight: 600,
              cursor: 'pointer',
              marginTop: 12,
            }}
          >
            {t('Explorar Peças')}
          </button>
        </div>
      </div>
    );
  }

  if (!frete && !pedidoConcluido) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: CREAM }}>
        <Header />
        <div
          style={{
            maxWidth: 600,
            margin: '4rem auto',
            background: 'var(--bp-surface)',
            borderRadius: 16,
            padding: '3rem 2rem',
            textAlign: 'center',
            border: `1px solid ${BORDER}`,
          }}
        >
          <h2 style={{ color: BORDEAUX, marginTop: 0 }}>
            {t('Calcule o frete primeiro')}
          </h2>
          <p style={{ color: MUTED }}>
            {t('Volte ao carrinho e selecione uma opção de entrega.')}
          </p>
          <button
            onClick={() => navigate('/carrinho')}
            style={{
              backgroundColor: BORDEAUX,
              color: CREAM,
              padding: '12px 28px',
              border: 'none',
              borderRadius: 10,
              fontWeight: 600,
              cursor: 'pointer',
              marginTop: 12,
            }}
          >
            {t('Voltar ao Carrinho')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: CREAM }}>
      <style>{`
        @media (max-width: 980px) {
          .checkout-grid { grid-template-columns: 1fr !important; }
        }
        .input-clean {
          width: 100%;
          padding: 11px 14px;
          border: 2px solid ${BORDER};
          border-radius: 10px;
          font-size: 0.93rem;
          background: #fff;
          color: ${DARK};
          outline: none;
          transition: border-color 0.18s;
          box-sizing: border-box;
        }
        .input-clean:focus { border-color: ${BORDEAUX}; }
        .input-error { border-color: #FCA5A5 !important; background: #FEF2F2; }
        .label-clean {
          display: block;
          font-size: 0.78rem;
          font-weight: 600;
          color: ${MUTED};
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .pag-card {
          padding: 16px;
          border: 2px solid ${BORDER};
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.18s;
          background: #fff;
          display: flex; align-items: center; gap: 14px;
        }
        .pag-card:hover { border-color: ${HIGHLIGHT}; }
        .pag-card.ativo { border-color: ${BORDEAUX}; background: ${CREAM}; box-shadow: 0 4px 12px rgba(123,29,46,0.15); }
        .step-circle {
          width: 36px; height: 36px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700;
          transition: all 0.25s;
          flex-shrink: 0;
        }
        .spinner-lg {
          width: 22px; height: 22px;
          border: 3px solid ${CREAM};
          border-top-color: ${BORDEAUX};
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          display: inline-block;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <Header />

      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '2rem 1.5rem 4rem',
        }}
      >
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.8rem', color: MUTED, marginBottom: 6 }}>
            <span style={{ cursor: 'pointer' }} onClick={() => navigate('/carrinho')}>
              {t('Carrinho')}
            </span>{' '}
            ›{' '}
            <span style={{ color: BORDEAUX, fontWeight: 600 }}>
              {t('Finalizar Compra')}
            </span>
          </div>
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: 700,
              color: BORDEAUX,
              margin: 0,
              fontFamily: "'Playfair Display', Georgia, serif",
            }}
          >
            {etapa === 4 ? t('Compra completa') : t('Finalizar Compra')}
          </h1>
        </div>

        {/* Stepper */}
        <Stepper etapa={etapa} />

        {etapa === 4 ? (
          <CompraCompleta
            pedido={pedidoConcluido}
            onAcompanhar={() => navigate(`/pedidos/${pedidoConcluido.id}`, { replace: true })}
            onContinuar={() => navigate('/buscaPecas', { replace: true })}
          />
        ) : (
          <div
            className="checkout-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 400px',
              gap: '1.5rem',
              alignItems: 'start',
            }}
          >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {etapa === 1 && (
              <EnderecoForm
                endereco={endereco}
                setEndereco={setEndereco}
                errors={errors}
              />
            )}
            {etapa === 2 && (
              <PagamentoForm
                pagamento={pagamento}
                setPagamento={setPagamento}
                dadosCartao={dadosCartao}
                setDadosCartao={setDadosCartao}
                errors={errors}
                totalEstimado={totais.total}
              />
            )}
            {etapa === 3 && (
              <RevisaoPedido
                endereco={endereco}
                pagamento={FORMAS_PAGAMENTO.find((f) => f.id === pagamento)}
                frete={frete}
                cartItems={cartItems}
              />
            )}

            {erroFinal && (
              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#FEE2E2',
                  color: '#7F1D1D',
                  border: '1px solid #FCA5A5',
                  borderRadius: 10,
                  fontSize: '0.9rem',
                  fontWeight: 600,
                }}
              >
                ⚠️ {erroFinal}
              </div>
            )}

            <div
              style={{
                display: 'flex',
                gap: 12,
                justifyContent: 'space-between',
                marginTop: 8,
              }}
            >
              <button
                onClick={() => (etapa === 1 ? navigate('/carrinho') : setEtapa(etapa - 1))}
                disabled={processando}
                style={{
                  padding: '12px 22px',
                  backgroundColor: 'transparent',
                  color: BORDEAUX,
                  border: `2px solid ${BORDEAUX}`,
                  borderRadius: 10,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                }}
              >
                ← Voltar
              </button>

              {etapa < 3 ? (
                <button
                  onClick={proximaEtapa}
                  style={{
                    padding: '12px 28px',
                    backgroundColor: BORDEAUX,
                    color: CREAM,
                    border: 'none',
                    borderRadius: 10,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                  }}
                >
                  Continuar →
                </button>
              ) : (
                <button
                  onClick={finalizar}
                  disabled={processando}
                  style={{
                    padding: '12px 32px',
                    backgroundColor: processando ? MUTED : BORDEAUX,
                    color: CREAM,
                    border: 'none',
                    borderRadius: 10,
                    fontWeight: 700,
                    cursor: processando ? 'not-allowed' : 'pointer',
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  {processando ? (
                    <>
                      <span className="spinner-lg" /> {t('processing')}
                    </>
                  ) : (
                    t('confirmPaymentAndComplete')
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Resumo lateral */}
          <div style={{ position: 'sticky', top: 20 }}>
            <ResumoLateral
              cartItems={cartItems}
              subtotal={subtotal}
              cupom={cupom}
              frete={frete}
              totais={totais}
              pagamento={FORMAS_PAGAMENTO.find((f) => f.id === pagamento)}
            />
          </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CompraCompleta({ pedido, onAcompanhar, onContinuar }) {
  const { t } = useLanguage();
  return (
    <section
      style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '3rem 2rem',
        border: `1px solid ${BORDER}`,
        borderRadius: 18,
        backgroundColor: 'var(--bp-surface)',
        textAlign: 'center',
        boxShadow: '0 14px 35px rgba(21, 34, 24, 0.08)',
      }}
    >
      <div
        style={{
          display: 'grid',
          placeItems: 'center',
          width: 76,
          height: 76,
          margin: '0 auto 1.25rem',
          borderRadius: '50%',
          backgroundColor: '#D1FAE5',
          color: '#065F46',
          fontSize: '2.2rem',
          fontWeight: 800,
        }}
      >
        OK
      </div>
      <span
        style={{
          color: '#065F46',
          fontWeight: 800,
          fontSize: '0.82rem',
          textTransform: 'uppercase',
          letterSpacing: 0.8,
        }}
      >
        {t('Pagamento confirmado')}
      </span>
      <h2
        style={{
          margin: '0.6rem 0',
          color: BORDEAUX,
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: '2rem',
        }}
      >
        {t('Compra concluída com sucesso')}
      </h2>
      <p style={{ margin: '0 auto', maxWidth: 520, color: MUTED, lineHeight: 1.65 }}>
        {t('orderConfirmed', { id: pedido?.id })}
      </p>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 12,
          flexWrap: 'wrap',
          marginTop: '1.75rem',
        }}
      >
        <button
          type="button"
          onClick={onAcompanhar}
          style={{
            padding: '12px 24px',
            border: 0,
            borderRadius: 10,
            backgroundColor: BORDEAUX,
            color: CREAM,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {t('Acompanhar pedido')}
        </button>
        <button
          type="button"
          onClick={onContinuar}
          style={{
            padding: '12px 24px',
            border: `2px solid ${BORDEAUX}`,
            borderRadius: 10,
            backgroundColor: 'transparent',
            color: BORDEAUX,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {t('Continuar comprando')}
        </button>
      </div>
    </section>
  );
}

function Stepper({ etapa }) {
  const { t } = useLanguage();
  const steps = ['deliveryAddress', 'payment', 'reviewOrder', 'completePurchase'];
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: '2rem',
        backgroundColor: 'var(--bp-surface)',
        padding: '1rem 1.25rem',
        borderRadius: 12,
        border: `1px solid ${BORDER}`,
        flexWrap: 'wrap',
      }}
    >
      {steps.map((label, i) => {
        const numero = i + 1;
        const ativo = etapa === numero;
        const concluido = etapa > numero;
        return (
          <div
            key={label}
            style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 130 }}
          >
            <div
              className="step-circle"
              style={{
                backgroundColor: concluido
                  ? '#065F46'
                  : ativo
                  ? BORDEAUX
                  : '#F2EAD3',
                color: concluido || ativo ? CREAM : MUTED,
              }}
            >
              {numero}
            </div>
            <div>
              <div
                style={{
                  fontSize: '0.72rem',
                  color: MUTED,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: 0.4,
                }}
              >
                {t('Etapa')} {numero}
              </div>
              <div
                style={{
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: ativo || concluido ? DARK : MUTED,
                }}
              >
                {t(label)}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  backgroundColor: concluido ? '#065F46' : BORDER,
                  margin: '0 6px',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Field({ label, error, children, span = 1 }) {
  return (
    <div style={{ gridColumn: `span ${span}` }}>
      <label className="label-clean">{label}</label>
      {children}
      {error && (
        <div style={{ fontSize: '0.78rem', color: ERROR_FG, marginTop: 4 }}>
          {error}
        </div>
      )}
    </div>
  );
}

function EnderecoForm({ endereco, setEndereco, errors }) {
  const { t } = useLanguage();
  const handleChange = (campo, valor) =>
    setEndereco((prev) => ({ ...prev, [campo]: valor }));

  return (
    <section
      style={{
        backgroundColor: 'var(--bp-surface)',
        borderRadius: 16,
        padding: '1.5rem',
        border: `1px solid ${BORDER}`,
      }}
    >
      <h2 style={{ margin: '0 0 4px', color: BORDEAUX, fontSize: '1.15rem' }}>
        {t('deliveryAddress')}
      </h2>
      <p style={{ margin: '0 0 1.5rem', color: MUTED, fontSize: '0.88rem' }}>
        {t('deliveryAddressDescription')}
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: '1rem',
        }}
      >
        <Field label={t('recipientName')} error={errors.nome} span={6}>
          <input
            className={`input-clean ${errors.nome ? 'input-error' : ''}`}
            value={endereco.nome}
            onChange={(e) => handleChange('nome', e.target.value)}
            placeholder={t('fullNamePlaceholder')}
          />
        </Field>

        <Field label={t('zipCode')} error={errors.cep} span={2}>
          <input
            className={`input-clean ${errors.cep ? 'input-error' : ''}`}
            value={endereco.cep}
            onChange={(e) => handleChange('cep', formatarCep(e.target.value))}
            placeholder={t('zipPlaceholder')}
            maxLength={9}
          />
        </Field>
        <Field label={t('phone')} error={errors.telefone} span={2}>
          <input
            className={`input-clean ${errors.telefone ? 'input-error' : ''}`}
            value={endereco.telefone}
            onChange={(e) =>
              handleChange('telefone', e.target.value.replace(/\D/g, '').slice(0, 11))
            }
            placeholder={t('phonePlaceholder')}
          />
        </Field>
        <Field label="UF" error={errors.uf} span={2}>
          <input
            className={`input-clean ${errors.uf ? 'input-error' : ''}`}
            value={endereco.uf}
            onChange={(e) =>
              handleChange('uf', e.target.value.toUpperCase().slice(0, 2))
            }
            placeholder={t('statePlaceholder')}
            maxLength={2}
          />
        </Field>

        <Field label={t('address')} error={errors.logradouro} span={4}>
          <input
            className={`input-clean ${errors.logradouro ? 'input-error' : ''}`}
            value={endereco.logradouro}
            onChange={(e) => handleChange('logradouro', e.target.value)}
            placeholder={t('streetPlaceholder')}
          />
        </Field>
        <Field label={t('number')} error={errors.numero} span={2}>
          <input
            className={`input-clean ${errors.numero ? 'input-error' : ''}`}
            value={endereco.numero}
            onChange={(e) => handleChange('numero', e.target.value)}
            placeholder={t('numberPlaceholder')}
          />
        </Field>

        <Field label={t('complementOptional')} span={3}>
          <input
            className="input-clean"
            value={endereco.complemento}
            onChange={(e) => handleChange('complemento', e.target.value)}
            placeholder={t('complementPlaceholder')}
          />
        </Field>
        <Field label={t('neighborhood')} error={errors.bairro} span={3}>
          <input
            className={`input-clean ${errors.bairro ? 'input-error' : ''}`}
            value={endereco.bairro}
            onChange={(e) => handleChange('bairro', e.target.value)}
            placeholder={t('neighborhoodPlaceholder')}
          />
        </Field>

        <Field label={t('city')} error={errors.cidade} span={6}>
          <input
            className={`input-clean ${errors.cidade ? 'input-error' : ''}`}
            value={endereco.cidade}
            onChange={(e) => handleChange('cidade', e.target.value)}
            placeholder={t('cityPlaceholder')}
          />
        </Field>
      </div>
    </section>
  );
}

function PagamentoForm({
  pagamento,
  setPagamento,
  dadosCartao,
  setDadosCartao,
  errors,
  totalEstimado,
}) {
  const { t } = useLanguage();
  const handleCartao = (campo, valor) =>
    setDadosCartao((prev) => ({ ...prev, [campo]: valor }));

  return (
    <section
      style={{
        backgroundColor: 'var(--bp-surface)',
        borderRadius: 16,
        padding: '1.5rem',
        border: `1px solid ${BORDER}`,
      }}
    >
      <h2 style={{ margin: '0 0 4px', color: BORDEAUX, fontSize: '1.15rem' }}>
        {t('paymentMethod')}
      </h2>
      <p style={{ margin: '0 0 1.5rem', color: MUTED, fontSize: '0.88rem' }}>
        {t('paymentMethodDescription')}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {FORMAS_PAGAMENTO.map((forma) => {
          const ativo = pagamento === forma.id;
          return (
            <div
              key={forma.id}
              className={`pag-card ${ativo ? 'ativo' : ''}`}
              onClick={() => setPagamento(forma.id)}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  backgroundColor: ativo ? BORDEAUX : `${BORDEAUX}15`,
                  color: ativo ? CREAM : BORDEAUX,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                }}
              >
                {forma.icone}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: DARK }}>{t(forma.id === 'pix' ? 'pixPayment' : forma.id === 'cartao' ? 'cardPayment' : 'bankSlip')}</div>
                <div style={{ fontSize: '0.82rem', color: MUTED }}>
                  {t(forma.id === 'pix' ? 'paymentApproval' : forma.id === 'cartao' ? 'cardDescription' : 'bankSlipDescription')}
                  {forma.desconto > 0 && (
                    <span
                      style={{
                        marginLeft: 8,
                        color: '#065F46',
                        fontWeight: 700,
                      }}
                    >
                      {Math.round(forma.desconto * 100)}% OFF
                    </span>
                  )}
                </div>
              </div>
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  border: `2px solid ${ativo ? BORDEAUX : BORDER}`,
                  backgroundColor: ativo ? BORDEAUX : '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {ativo && (
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: CREAM,
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {pagamento === 'cartao' && (
        <div
          style={{
            marginTop: '1.5rem',
            paddingTop: '1.5rem',
            borderTop: `1px dashed ${BORDER}`,
          }}
        >
          <h3
            style={{
              margin: '0 0 1rem',
              fontSize: '1rem',
              color: DARK,
              fontWeight: 700,
            }}
          >
            {t('cardData')}
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gap: '1rem',
            }}
          >
            <Field label={t('cardNumber')} error={errors.cardNumero} span={6}>
              <input
                className={`input-clean ${errors.cardNumero ? 'input-error' : ''}`}
                value={dadosCartao.numero}
                onChange={(e) =>
                  handleCartao('numero', formatarNumeroCartao(e.target.value))
                }
                placeholder={t('cardNumberPlaceholder')}
                maxLength={23}
              />
            </Field>
            <Field label={t('printedName')} error={errors.cardNome} span={6}>
              <input
                className={`input-clean ${errors.cardNome ? 'input-error' : ''}`}
                value={dadosCartao.nome}
                onChange={(e) =>
                  handleCartao('nome', e.target.value.toUpperCase())
                }
                placeholder={t('cardNamePlaceholder')}
              />
            </Field>
            <Field label={t('expiry')} error={errors.cardValidade} span={2}>
              <input
                className={`input-clean ${errors.cardValidade ? 'input-error' : ''}`}
                value={dadosCartao.validade}
                onChange={(e) =>
                  handleCartao('validade', formatarValidade(e.target.value))
                }
                placeholder={t('cardExpiryPlaceholder')}
                maxLength={5}
              />
            </Field>
            <Field label="CVV" error={errors.cardCvv} span={2}>
              <input
                className={`input-clean ${errors.cardCvv ? 'input-error' : ''}`}
                value={dadosCartao.cvv}
                onChange={(e) =>
                  handleCartao(
                    'cvv',
                    e.target.value.replace(/\D/g, '').slice(0, 4),
                  )
                }
                placeholder={t('cardCvvPlaceholder')}
                maxLength={4}
              />
            </Field>
            <Field label={t('installments')} span={2}>
              <select
                className="input-clean"
                value={dadosCartao.parcelas}
                onChange={(e) => handleCartao('parcelas', Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                  <option key={n} value={n}>
                    {n}x de {formatBRL(totalEstimado / n)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>
      )}

      {pagamento === 'pix' && (
        <InfoBox
          icone="📱"
          titulo={t('pixPayment')}
          texto={t('pixDescription')}
        />
      )}
      {pagamento === 'boleto' && (
        <InfoBox
          icone="🧾"
          titulo={t('bankSlip')}
          texto={t('bankSlipDescription')}
        />
      )}
    </section>
  );
}

function InfoBox({ icone, titulo, texto }) {
  return (
    <div
      style={{
        marginTop: '1.5rem',
        padding: '1rem 1.25rem',
        backgroundColor: `${HIGHLIGHT}22`,
        border: `1px solid ${HIGHLIGHT}`,
        borderRadius: 10,
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
      }}
    >
      <span style={{ fontSize: '1.4rem' }}>{icone}</span>
      <div>
        <div style={{ fontWeight: 700, color: DARK }}>{titulo}</div>
        <div style={{ fontSize: '0.85rem', color: MUTED, marginTop: 4 }}>
          {texto}
        </div>
      </div>
    </div>
  );
}

function RevisaoPedido({ endereco, pagamento, frete, cartItems }) {
  const { t } = useLanguage();
  return (
    <section
      style={{
        backgroundColor: 'var(--bp-surface)',
        borderRadius: 16,
        padding: '1.5rem',
        border: `1px solid ${BORDER}`,
      }}
    >
      <h2 style={{ margin: '0 0 1.5rem', color: BORDEAUX, fontSize: '1.15rem' }}>
        {t('reviewOrder')}
      </h2>

      <BlocoRevisao titulo={t('address')}>
        <div style={{ color: DARK, fontWeight: 600 }}>{endereco.nome}</div>
        <div style={{ color: MUTED, marginTop: 4, fontSize: '0.92rem' }}>
          {endereco.logradouro}, {endereco.numero}
          {endereco.complemento && ` - ${endereco.complemento}`}
          <br />
          {endereco.bairro} - {endereco.cidade}/{endereco.uf}
          <br />
          CEP {endereco.cep} • Tel: {endereco.telefone}
        </div>
      </BlocoRevisao>

      <BlocoRevisao titulo={t('deliveryLabel')}>
        <div style={{ color: DARK, fontWeight: 600 }}>
          {frete.transportadora} — {frete.tipo}
        </div>
        <div style={{ color: MUTED, marginTop: 4, fontSize: '0.92rem' }}>
          {frete.prazo_texto} • {formatBRL(frete.valor)}
        </div>
      </BlocoRevisao>

      <BlocoRevisao titulo={t('payment')}>
        <div style={{ color: DARK, fontWeight: 600 }}>
          {pagamento.icone} {pagamento.nome}
        </div>
        <div style={{ color: MUTED, marginTop: 4, fontSize: '0.92rem' }}>
          {pagamento.descricao}
        </div>
      </BlocoRevisao>

      <BlocoRevisao titulo={`Itens (${cartItems.length})`} ultimo>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {cartItems.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.9rem',
                color: DARK,
              }}
            >
              <span>
                {item.quantidade}× {item.nome}
              </span>
              <span style={{ fontWeight: 600 }}>
                {formatBRL(Number(item.preco) * item.quantidade)}
              </span>
            </div>
          ))}
        </div>
      </BlocoRevisao>
    </section>
  );
}

function BlocoRevisao({ titulo, children, ultimo }) {
  return (
    <div
      style={{
        paddingBottom: ultimo ? 0 : '1.25rem',
        marginBottom: ultimo ? 0 : '1.25rem',
        borderBottom: ultimo ? 'none' : `1px dashed ${BORDER}`,
      }}
    >
      <div
        style={{
          fontSize: '0.72rem',
          color: MUTED,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          fontWeight: 700,
          marginBottom: 8,
        }}
      >
        {titulo}
      </div>
      {children}
    </div>
  );
}

function ResumoLateral({ cartItems, subtotal, cupom, frete, totais, pagamento }) {
  const { t } = useLanguage();
  const totalItens = contarItensCarrinho(cartItems);

  return (
    <section
      style={{
        backgroundColor: 'var(--bp-surface)',
        borderRadius: 16,
        padding: '1.5rem',
        border: `1px solid ${BORDER}`,
      }}
    >
      <h2 style={{ margin: '0 0 1.25rem', color: BORDEAUX, fontSize: '1.1rem' }}>
        {t('orderSummary')}
      </h2>

      <div
        style={{
          maxHeight: 200,
          overflowY: 'auto',
          marginBottom: '1rem',
          paddingRight: 4,
        }}
      >
        {cartItems.map((item) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              gap: 10,
              padding: '8px 0',
              borderBottom: `1px solid ${BORDER}`,
              alignItems: 'center',
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 8,
                backgroundColor: '#F2EAD3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              {item.imagem ? (
                <img
                  src={item.imagem}
                  alt={item.nome}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span>🔧</span>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: DARK,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.nome}
              </div>
              <div style={{ fontSize: '0.75rem', color: MUTED }}>
                {t('quantity')}: {item.quantidade}
              </div>
            </div>
            <div
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color: BORDEAUX,
                whiteSpace: 'nowrap',
              }}
            >
              {formatBRL(Number(item.preco) * item.quantidade)}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Linha label={`Subtotal (${totalItens} itens)`} valor={formatBRL(subtotal)} />
        {cupom && (
          <Linha
            label={`Cupom ${cupom.codigo}`}
            valor={`- ${formatBRL(totais.desconto)}`}
            cor="#065F46"
          />
        )}
        {pagamento && totais.descontoPagamento > 0 && (
          <Linha
            label={`Desc. ${pagamento.nome}`}
            valor={`- ${formatBRL(totais.descontoPagamento)}`}
            cor="#065F46"
          />
        )}
        <Linha
          label={t('shipping')}
          valor={
            totais.valorFrete === 0 && cupom?.tipo === 'frete_gratis'
              ? t('free')
              : formatBRL(totais.valorFrete)
          }
        />
      </div>

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
            fontSize: '0.78rem',
            color: MUTED,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          {t('total')}
        </div>
        <div
          style={{ fontSize: '1.6rem', fontWeight: 800, color: BORDEAUX, lineHeight: 1 }}
        >
          {formatBRL(totais.total)}
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          padding: '10px 12px',
          backgroundColor: '#FAFAFA',
          borderRadius: 8,
          fontSize: '0.75rem',
          color: MUTED,
          textAlign: 'center',
          border: `1px solid ${BORDER}`,
        }}
      >
        🔒 {t('protectedData')}
      </div>
    </section>
  );
}

function Linha({ label, valor, cor = DARK }) {
  return (
    <div
      style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}
    >
      <span style={{ color: MUTED }}>{label}</span>
      <span style={{ color: cor, fontWeight: 600 }}>{valor}</span>
    </div>
  );
}
