import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { listarWish, removerPecaWish } from '../services/pecasService';
import {
  BORDER_RADIUS,
  BUTTON_PRIMARY_STYLE,
  BUTTON_SECONDARY_STYLE,
  COLORS,
  SHADOWS,
  SPACING,
} from '../styles/theme';
import { parseUnexpectedError } from '../utils/friendlyErrors';

function formatarPreco(valor) {
  const numero = Number(valor);

  if (Number.isNaN(numero)) {
    return valor ? `R$ ${valor}` : 'Preço não informado';
  }

  return numero.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export default function WishPage() {
  const navigate = useNavigate();
  const [pecas, setPecas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  async function carregarWish() {
    setLoading(true);
    setErrorMessage('');

    try {
      const data = await listarWish();
      setPecas(Array.isArray(data?.pecas) ? data.pecas : []);
    } catch (error) {
      setPecas([]);
      setErrorMessage(parseUnexpectedError(error, 'Não foi possível carregar sua lista de desejos agora.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarWish();
  }, []);

  async function handleRemover(event, pecaId) {
    event.stopPropagation();

    if (!pecaId || removingId) return;

    setRemovingId(pecaId);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      await removerPecaWish(pecaId);
      setPecas((prev) => prev.filter((peca) => String(peca.id) !== String(pecaId)));
      setSuccessMessage('Peça removida da sua lista de desejos.');
    } catch (error) {
      setErrorMessage(parseUnexpectedError(error, 'Não foi possível remover a peça da lista de desejos.'));
    } finally {
      setRemovingId(null);
    }
  }

  const wishVazia = !loading && !errorMessage && pecas.length === 0;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.CREAM }}>
      <style>{`
        @media (max-width: 780px) {
          .wish-header {
            grid-template-columns: 1fr !important;
          }

          .wish-card {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <Header />

      <main style={{ padding: SPACING.XL }}>
        <div
          style={{
            maxWidth: 1120,
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: SPACING.LG,
          }}
        >
          <section
            className="wish-header"
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 0.8fr',
              gap: SPACING.LG,
              alignItems: 'stretch',
            }}
          >
            <div
              style={{
                background: `linear-gradient(135deg, ${COLORS.BORDEAUX} 0%, #4D101C 100%)`,
                color: COLORS.CREAM,
                borderRadius: BORDER_RADIUS.LG,
                padding: SPACING.XL,
                boxShadow: SHADOWS.MD,
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  backgroundColor: 'rgba(240, 192, 96, 0.16)',
                  color: '#F0C060',
                  border: '1px solid rgba(240, 192, 96, 0.45)',
                  borderRadius: BORDER_RADIUS.FULL,
                  padding: '0.35rem 0.75rem',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  marginBottom: SPACING.MD,
                }}
              >
                Área pessoal
              </span>

              <h1
                style={{
                  margin: 0,
                  fontFamily: "'Georgia', serif",
                  fontSize: '2rem',
                  lineHeight: 1.15,
                }}
              >
                Minha lista de desejos
              </h1>

              <p style={{ margin: `${SPACING.MD} 0 0`, lineHeight: 1.65, color: '#F8E9C5' }}>
                Salve as peças que você quer acompanhar, compare opções com calma e volte para o anúncio original com um clique.
              </p>
            </div>

            <div
              style={{
                backgroundColor: '#fff',
                borderRadius: BORDER_RADIUS.LG,
                padding: SPACING.XL,
                boxShadow: SHADOWS.SM,
                border: '1px solid rgba(123, 29, 46, 0.12)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: SPACING.MD,
              }}
            >
              <strong style={{ color: COLORS.BORDEAUX, fontSize: '2rem' }}>{pecas.length}</strong>
              <span style={{ color: COLORS.MUTED_TEXT, fontWeight: 700 }}>
                {pecas.length === 1 ? 'peça salva' : 'peças salvas'} na sua lista de desejos
              </span>
              <button type="button" onClick={() => navigate('/buscaPecas')} style={BUTTON_PRIMARY_STYLE}>
                Explorar catálogo
              </button>
            </div>
          </section>

          {successMessage && (
            <div
              style={{
                backgroundColor: '#FFF7D6',
                color: COLORS.BORDEAUX,
                padding: SPACING.MD,
                borderRadius: BORDER_RADIUS.MD,
                border: '2px solid #F0C060',
                fontWeight: 700,
              }}
            >
              {successMessage}
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
              }}
            >
              {errorMessage}
            </div>
          )}

          {loading && (
            <div style={{ color: COLORS.BORDEAUX, fontWeight: 800 }}>
              Carregando sua lista de desejos...
            </div>
          )}

          {wishVazia && (
            <section
              style={{
                backgroundColor: '#fff',
                borderRadius: BORDER_RADIUS.LG,
                padding: SPACING.XL,
                boxShadow: SHADOWS.SM,
                border: '1px solid rgba(123, 29, 46, 0.12)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '3rem', marginBottom: SPACING.MD }}>♡</div>
              <h2 style={{ margin: 0, color: COLORS.BORDEAUX }}>Sua lista de desejos ainda está vazia</h2>
              <p style={{ color: COLORS.MUTED_TEXT, lineHeight: 1.6 }}>
                Abra o catálogo e clique no coração das peças que deseja guardar.
              </p>
              <button type="button" onClick={() => navigate('/buscaPecas')} style={BUTTON_PRIMARY_STYLE}>
                Ver peças disponíveis
              </button>
            </section>
          )}

          {!loading && pecas.length > 0 && (
            <section style={{ display: 'flex', flexDirection: 'column', gap: SPACING.MD }}>
              {pecas.map((peca) => (
                <article
                  key={peca.id}
                  className="wish-card"
                  onClick={() => navigate(`/pecas/${peca.id}`)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '210px 1fr auto',
                    gap: SPACING.LG,
                    backgroundColor: '#fff',
                    borderRadius: BORDER_RADIUS.LG,
                    boxShadow: SHADOWS.SM,
                    border: '1px solid rgba(123, 29, 46, 0.12)',
                    overflow: 'hidden',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      minHeight: 160,
                      backgroundColor: '#EFE2C6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}
                  >
                    {peca.imagem ? (
                      <img
                        src={peca.imagem}
                        alt={peca.nome_peca || 'Imagem da peça'}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    ) : (
                      <span style={{ color: COLORS.BORDEAUX, fontWeight: 800 }}>Sem imagem</span>
                    )}
                  </div>

                  <div style={{ padding: `${SPACING.LG} 0`, display: 'flex', flexDirection: 'column', gap: SPACING.SM }}>
                    <h2 style={{ color: COLORS.BORDEAUX, margin: 0, fontSize: '1.25rem' }}>
                      {peca.nome_peca || 'Peça sem nome'}
                    </h2>
                    <p style={{ margin: 0, color: COLORS.MUTED_TEXT }}>
                      {peca.sku ? `SKU: ${peca.sku}` : 'SKU não informado'}
                    </p>
                    <p style={{ margin: 0, color: COLORS.MUTED_TEXT }}>
                      {peca.oem_number ? `OEM: ${peca.oem_number}` : 'OEM não informado'}
                    </p>
                    <strong style={{ color: COLORS.BORDEAUX, fontSize: '1.2rem' }}>
                      {formatarPreco(peca.preco)}
                    </strong>
                  </div>

                  <div
                    style={{
                      padding: SPACING.LG,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'flex-end',
                      gap: SPACING.MD,
                    }}
                  >
                    <span
                      style={{
                        color: Number(peca.estoque_atual) > 0 ? COLORS.SUCCESS_DARK : '#991B1B',
                        backgroundColor: Number(peca.estoque_atual) > 0 ? COLORS.SUCCESS : COLORS.ERROR,
                        borderRadius: BORDER_RADIUS.FULL,
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Estoque: {peca.estoque_atual ?? 0}
                    </span>

                    <button
                      type="button"
                      onClick={(event) => handleRemover(event, peca.id)}
                      disabled={removingId === peca.id}
                      style={{
                        ...BUTTON_SECONDARY_STYLE,
                        opacity: removingId === peca.id ? 0.65 : 1,
                        cursor: removingId === peca.id ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Remover
                    </button>
                  </div>
                </article>
              ))}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
