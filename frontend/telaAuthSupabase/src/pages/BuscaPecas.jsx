import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import {
  adicionarPecaWish,
  listarCategorias,
  listarPecas,
  listarWish,
  removerPecaWish,
} from '../services/pecasService';

import {
  COLORS,
  SPACING,
  INPUT_STYLE,
  LABEL_STYLE,
  BUTTON_PRIMARY_STYLE,
  BORDER_RADIUS,
  SHADOWS,
} from '../styles/theme';
import { parseUnexpectedError } from '../utils/friendlyErrors';
import { useLanguage } from '../contexts/LanguageContext';

const MAX_PRICE_FILTER = 50000;
const SLIDER_MAX = 2000;

export default function BuscaPecas() {
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const nomeUrl = searchParams.get('nome') || '';
  const categoriaUrl = searchParams.get('categoria_id') || '';

  const [showFilters, setShowFilters] = useState(false);
  const [pecas, setPecas] = useState([]);
  const [totalPecas, setTotalPecas] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingCategorias, setLoadingCategorias] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [wishIds, setWishIds] = useState(() => new Set());
  const [wishLoadingId, setWishLoadingId] = useState(null);
  const PAGE_SIZE = 24;

  const [filters, setFilters] = useState({
    nome: nomeUrl,
    categoria_id: categoriaUrl,
    condicao: '',
    min_preco: 0,
    max_preco: MAX_PRICE_FILTER,
  });

  const [sort, setSort] = useState('preco');
  const [ordem, setOrdem] = useState('asc');

  useEffect(() => {
    async function carregarCategorias() {
      try {
        const data = await listarCategorias();
        setCategorias(Array.isArray(data) ? data : []);
      } catch (error) {
        setErrorMessage(error?.message || 'Não foi possível carregar as categorias agora.');
      } finally {
        setLoadingCategorias(false);
      }
    }

    carregarCategorias();
  }, []);

  useEffect(() => {
    const novoNome = searchParams.get('nome') || '';
    const novaCategoria = searchParams.get('categoria_id') || '';

    setFilters((prev) => ({
      ...prev,
      nome: novoNome,
      categoria_id: novaCategoria,
    }));
  }, [searchParams]);

  useEffect(() => {
    if (!feedbackMessage) return undefined;
    const timer = window.setTimeout(() => setFeedbackMessage(''), 3000);
    return () => window.clearTimeout(timer);
  }, [feedbackMessage]);

  const fetchPecas = async (page = 1, append = false) => {
    const params = { ...filters, sort, ordem, page, limit: PAGE_SIZE };

    if (append) setLoadingMore(true);
    else setLoading(true);
    setErrorMessage('');

    try {
      const result = await listarPecas(params);
      const pecasData = Array.isArray(result?.data) ? result.data : [];

      setPecas((prev) => append ? [...prev, ...pecasData] : pecasData);
      setTotalPecas(result?.total ?? pecasData.length);
      setHasMore(result?.hasMore ?? false);
      setCurrentPage(page);

      try {
        const wishData = await listarWish();
        const pecasWish = Array.isArray(wishData?.pecas) ? wishData.pecas : [];
        setWishIds(new Set(pecasWish.map((peca) => String(peca.id))));
      } catch { /* wish não é crítico */ }
    } catch (error) {
      if (!append) setPecas([]);
      setErrorMessage(parseUnexpectedError(error, t('loadError')));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleCarregarMais = () => fetchPecas(currentPage + 1, true);

  useEffect(() => {
    fetchPecas(1);
  }, [sort, ordem]);

  useEffect(() => {
    const delay = setTimeout(() => {
      fetchPecas(1);
    }, 400);

    return () => clearTimeout(delay);
  }, [filters]);

  const handleChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleSortClick = (campo) => {
    if (sort === campo) {
      setOrdem(ordem === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(campo);
      setOrdem('asc');
    }
  };


  async function handleWishClick(event, peca) {
    event.preventDefault();
    event.stopPropagation();

    if (!peca?.id || wishLoadingId) return;

    const pecaId = String(peca.id);
    const jaEstaNaWish = wishIds.has(pecaId);

    setWishLoadingId(peca.id);
    setFeedbackMessage('');

    try {
      if (jaEstaNaWish) {
        await removerPecaWish(peca.id);
        setWishIds((prev) => {
          const novoSet = new Set(prev);
          novoSet.delete(pecaId);
          return novoSet;
        });
        setFeedbackMessage(t('removedWishlist'));
      } else {
        await adicionarPecaWish(peca.id);
        setWishIds((prev) => new Set(prev).add(pecaId));
        setFeedbackMessage(t('addedWishlist'));
      }
    } catch (error) {
      setFeedbackMessage(parseUnexpectedError(error, t('wishlistError')));
    } finally {
      setWishLoadingId(null);
    }
  }

  function formatarPreco(valor) {
    const numero = Number(valor);

    if (Number.isNaN(numero)) {
      return `R$ ${valor}`;
    }

    return numero.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }

  function buscarNomeCategoria(categoriaId) {
    const categoria = categorias.find((item) => String(item.id) === String(categoriaId));
    return categoria?.nome || t('categoryUnknown');
  }

  const shouldShowEmptyState = !loading && !errorMessage && pecas.length === 0;

  // Valor real -> valor visual do slider
  function priceToSlider(price) {
    if (price <= 1000) {
      return price;
    }

    return (
      1000 +
      ((price - 1000) / (MAX_PRICE_FILTER - 1000)) * 1000
    );
  }

  // Valor do slider -> valor real
  function sliderToPrice(slider) {
    if (slider <= 1000) {
      return slider;
    }

    return Math.round(
      1000 +
        ((slider - 1000) / 1000) *
          (MAX_PRICE_FILTER - 1000)
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.CREAM }}>
      <style>{`
        .dual-range {
          pointer-events: none;
        }

        .dual-range::-webkit-slider-thumb {
          pointer-events: auto;
          cursor: pointer;
        }

        .dual-range::-moz-range-thumb {
          pointer-events: auto;
          cursor: pointer;
        }

        .peca-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .peca-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 18px 30px rgba(0, 0, 0, 0.14);
        }

        .peca-card-link {
          color: inherit;
          display: flex;
          text-decoration: none;
        }

        .peca-card-link:focus-visible {
          border-radius: ${BORDER_RADIUS.LG};
          outline: 3px solid var(--bp-action-border);
          outline-offset: 4px;
        }
      `}</style>

      <Header />

      <main>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: SPACING.SM,
          padding: `${SPACING.XL} ${SPACING.XL} 0`,
          flexWrap: 'wrap',
        }}>
          <span style={{ fontWeight: 'bold', color: COLORS.DARK_TEXT, marginRight: SPACING.SM }}>
            {t('sortBy')}
          </span>

          <button
            onClick={() => handleSortClick('preco')}
            style={{
              ...BUTTON_PRIMARY_STYLE,
              backgroundColor: sort === 'preco' ? 'var(--bp-primary-action)' : 'var(--bp-surface-muted)',
              color: sort === 'preco' ? 'var(--bp-on-primary)' : COLORS.DARK_TEXT,
              padding: '8px 16px',
            }}
          >
            {t('price')} {sort === 'preco' ? (ordem === 'asc' ? '↑' : '↓') : ''}
          </button>

          <button
            onClick={() => handleSortClick('data_cadastro')}
            style={{
              ...BUTTON_PRIMARY_STYLE,
              backgroundColor: sort === 'data_cadastro' ? 'var(--bp-primary-action)' : 'var(--bp-surface-muted)',
              color: sort === 'data_cadastro' ? 'var(--bp-on-primary)' : COLORS.DARK_TEXT,
              padding: '8px 16px',
            }}
          >
            {t('registrationDate')} {sort === 'data_cadastro' ? (ordem === 'asc' ? '↑' : '↓') : ''}
          </button>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: SPACING.MD,
          padding: SPACING.XL,
        }}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={BUTTON_PRIMARY_STYLE}
          >
            {showFilters ? t('hideFilters') : t('showFilters')}
          </button>
        </div>

        {showFilters && (
          <div style={{
            margin: `0 ${SPACING.XL}`,
            backgroundColor: 'var(--bp-surface)',
            padding: SPACING.XL,
            borderRadius: BORDER_RADIUS.LG,
            boxShadow: SHADOWS.SM,
          }}>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
              gap: SPACING.LG,
            }}>

              <div>
                <label style={LABEL_STYLE}>{t('name')}</label>
                <input
                  name="nome"
                  value={filters.nome}
                  onChange={handleChange}
                  style={INPUT_STYLE}
                />
              </div>

              <div>
                <label style={LABEL_STYLE}>{t('category')}</label>
                <select
                  name="categoria_id"
                  value={filters.categoria_id}
                  onChange={handleChange}
                  disabled={loadingCategorias}
                  style={INPUT_STYLE}
                >
                  <option value="">{loadingCategorias ? t('loading') : t('all')}</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={LABEL_STYLE}>{t('condition')}</label>
                <select
                  name="condicao"
                  value={filters.condicao}
                  onChange={handleChange}
                  style={INPUT_STYLE}
                >
                  <option value="">{t('all')}</option>
                  <option value="NOS">NOS</option>
                  <option value="EXCELENTE">Excelente</option>
                  <option value="BOM">Bom</option>
                  <option value="ACEITÁVEL">Aceitável</option>
                </select>
              </div>


              <div style={{ gridColumn: 'span 2', marginTop: SPACING.SM }}>
  <label style={LABEL_STYLE}>{t('priceRange')}</label>

  <div
    style={{
      position: 'relative',
      height: '70px',
      marginTop: '25px',
    }}
  >
    {/* input mínimo */}
    <div
      style={{
        position: 'absolute',
        top: '-8px',
        left: `${
          (priceToSlider(filters.min_preco) /
            SLIDER_MAX) *
          100
        }%`,
        transform: 'translateX(-50%)',
        zIndex: 10,
      }}
    >
      <input
        type="number"
        min="0"
        max={filters.max_preco}
        value={filters.min_preco}
        onChange={(e) => {
          const value = Number(e.target.value);

          setFilters((prev) => ({
            ...prev,
            min_preco: Math.min(
              value,
              prev.max_preco
            ),
          }));
        }}
        style={{
          width: '90px',
          backgroundColor: 'var(--bp-primary-action)',
          color: 'var(--bp-on-primary)',
          border: 'none',
          borderRadius: '4px',
          padding: '4px 8px',
          fontSize: '12px',
          fontWeight: 'bold',
          textAlign: 'center',
          outline: 'none',
        }}
      />
    </div>

    {/* input máximo */}
    <div
      style={{
        position: 'absolute',
        top: '-8px',
        left: `${
          (priceToSlider(filters.max_preco) /
            SLIDER_MAX) *
          100
        }%`,
        transform: 'translateX(-50%)',
        zIndex: 10,
      }}
    >
      <input
        type="number"
        min={filters.min_preco}
        max={MAX_PRICE_FILTER}
        value={filters.max_preco}
        onChange={(e) => {
          const value = Number(e.target.value);

          setFilters((prev) => ({
            ...prev,
            max_preco: Math.max(
              value,
              prev.min_preco
            ),
          }));
        }}
        style={{
          width: '90px',
          backgroundColor: 'var(--bp-primary-action)',
          color: 'var(--bp-on-primary)',
          border: 'none',
          borderRadius: '4px',
          padding: '4px 8px',
          fontSize: '12px',
          fontWeight: 'bold',
          textAlign: 'center',
          outline: 'none',
        }}
      />
    </div>

    {/* trilha */}
    <div
      style={{
        position: 'absolute',
        top: '38px',
        left: 0,
        right: 0,
        height: '4px',
        background: '#ddd',
        borderRadius: '4px',
      }}
    />

    {/* faixa ativa */}
    <div
      style={{
        position: 'absolute',
        top: '38px',
        left: `${
          (priceToSlider(filters.min_preco) /
            SLIDER_MAX) *
          100
        }%`,
        right: `${
          100 -
          (priceToSlider(filters.max_preco) /
            SLIDER_MAX) *
            100
        }%`,
        height: '4px',
        background: 'var(--bp-primary-action)',
        borderRadius: '4px',
      }}
    />

    {/* slider mínimo */}
    <input
      type="range"
      className="dual-range"
      min="0"
      max={SLIDER_MAX}
      value={priceToSlider(filters.min_preco)}
      onChange={(e) => {
        const value = sliderToPrice(
          Number(e.target.value)
        );

        setFilters((prev) => ({
          ...prev,
          min_preco: Math.min(
            value,
            prev.max_preco
          ),
        }));
      }}
      style={{
        position: 'absolute',
        top: '20px',
        width: '100%',
        height: '40px',
        appearance: 'none',
        background: 'none',
        zIndex: 3,
      }}
    />

    {/* slider máximo */}
    <input
      type="range"
      className="dual-range"
      min="0"
      max={SLIDER_MAX}
      value={priceToSlider(filters.max_preco)}
      onChange={(e) => {
        const value = sliderToPrice(
          Number(e.target.value)
        );

        setFilters((prev) => ({
          ...prev,
          max_preco: Math.max(
            value,
            prev.min_preco
          ),
        }));
      }}
      style={{
        position: 'absolute',
        top: '20px',
        width: '100%',
        height: '40px',
        appearance: 'none',
        background: 'none',
        zIndex: 4,
      }}
    />
  </div>
</div>
            </div>
          </div>
        )}

        {feedbackMessage && (
          <div
            style={{
              margin: `0 ${SPACING.XL} ${SPACING.MD}`,
              backgroundColor: '#FFF7D6',
              color: 'var(--bp-on-light)',
              padding: SPACING.MD,
              borderRadius: '0.625rem',
              border: '2px solid #F0C060',
              fontWeight: 700,
            }}
          >
            {feedbackMessage}
          </div>
        )}

        {errorMessage && (
          <div
            style={{
              margin: `0 ${SPACING.XL}`,
              backgroundColor: '#FEE2E2',
              color: '#7F1D1D',
              padding: SPACING.MD,
              borderRadius: '0.625rem',
              border: '2px solid #FCA5A5',
            }}
          >
            {errorMessage}
          </div>
        )}

        {loading && (
          <div style={{ padding: `0 ${SPACING.XL}`, color: COLORS.DARK_TEXT, fontWeight: 600 }}>
            {t('loadingParts')}
          </div>
        )}

        {shouldShowEmptyState && (
          <div style={{ padding: `0 ${SPACING.XL}`, color: COLORS.MUTED_TEXT }}>
            {t('noParts')}
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
          gap: SPACING.LG,
          padding: SPACING.XL,
        }}>
          {pecas.map((item) => (
            <Link
              key={item.id}
              to={`/pecas/${item.id}`}
              className="peca-card-link"
              aria-label={t('viewDetails', { name: item.nome_peca || t('partWithoutName') })}
            >
            <article
              className="peca-card"
              style={{
                backgroundColor: 'var(--bp-surface)',
                borderRadius: BORDER_RADIUS.LG,
                boxShadow: SHADOWS.SM,
                overflow: 'hidden',
                border: '1px solid rgba(123, 29, 46, 0.12)',
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: 190,
                  backgroundColor: '#EFE2C6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <button
                  type="button"
                  onClick={(event) => handleWishClick(event, item)}
                  disabled={wishLoadingId === item.id}
                  title={wishIds.has(String(item.id)) ? t('removedWishlist') : t('addedWishlist')}
                  style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    zIndex: 2,
                    width: 42,
                    height: 42,
                    borderRadius: '999px',
                    border: `2px solid ${wishIds.has(String(item.id)) ? 'var(--bp-primary-action)' : '#fff'}`,
                    backgroundColor: wishIds.has(String(item.id)) ? 'var(--bp-primary-action)' : 'rgba(255, 255, 255, 0.92)',
                    color: wishIds.has(String(item.id)) ? 'var(--bp-on-primary)' : 'var(--bp-on-light)',
                    boxShadow: '0 8px 18px rgba(0,0,0,0.18)',
                    cursor: wishLoadingId === item.id ? 'not-allowed' : 'pointer',
                    fontSize: '1.25rem',
                    fontWeight: 900,
                    lineHeight: 1,
                    opacity: wishLoadingId === item.id ? 0.7 : 1,
                  }}
                >
                  {wishIds.has(String(item.id)) ? '♥' : '♡'}
                </button>
                {item.imagem ? (
                  <img
                    src={item.imagem}
                    alt={item.nome_peca || t('partWithoutName')}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'column',
                      color: 'var(--bp-on-light)',
                      fontWeight: 700,
                      textAlign: 'center',
                      padding: SPACING.MD,
                    }}
                  >
                    <span style={{ fontSize: '2rem', marginBottom: SPACING.SM }}>🔧</span>
                    <span>{t('noImage')}</span>
                  </div>
                )}
              </div>

              <div style={{ padding: SPACING.LG, display: 'flex', flexDirection: 'column', gap: SPACING.SM }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: SPACING.MD }}>
                  <h2
                    style={{
                      margin: 0,
                      color: COLORS.DARK_TEXT,
                      fontSize: '1.15rem',
                      lineHeight: 1.3,
                    }}
                  >
                    {item.nome_peca || t('partWithoutName')}
                  </h2>

                  <span
                    style={{
                      backgroundColor: '#F8E9C5',
                      color: 'var(--bp-on-light)',
                      borderRadius: '999px',
                      padding: '0.25rem 0.6rem',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      height: 'fit-content',
                    }}
                  >
                    {item.condicao || 'N/I'}
                  </span>
                </div>

                <p
                  style={{
                    margin: 0,
                    color: COLORS.MUTED_TEXT,
                    fontSize: '0.9rem',
                  }}
                >
                  {t('category')}: {buscarNomeCategoria(item.categoria_id)}
                </p>

                {item.sku && (
                  <p
                    style={{
                      margin: 0,
                      color: COLORS.MUTED_TEXT,
                      fontSize: '0.9rem',
                    }}
                  >
                      {t('sku', { value: item.sku })}
                  </p>
                )}

                {item.oem_number && (
                  <p
                    style={{
                      margin: 0,
                      color: COLORS.MUTED_TEXT,
                      fontSize: '0.9rem',
                    }}
                  >
                      {t('oem', { value: item.oem_number })}
                  </p>
                )}

                <div
                  style={{
                    marginTop: SPACING.SM,
                    paddingTop: SPACING.SM,
                    borderTop: '1px solid var(--bp-border-light)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: SPACING.MD,
                  }}
                >
                  <strong
                    style={{
                      color: COLORS.DARK_TEXT,
                      fontSize: '1.15rem',
                    }}
                  >
                    {formatarPreco(item.preco)}
                  </strong>

                  <span
                    style={{
                      color: Number(item.estoque_atual) > 0 ? '#065F46' : '#991B1B',
                      backgroundColor: Number(item.estoque_atual) > 0 ? '#D1FAE5' : '#FEE2E2',
                      borderRadius: '999px',
                      padding: '0.25rem 0.65rem',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {t('stock', { value: item.estoque_atual ?? 0 })}
                  </span>
                </div>
              </div>
            </article>
            </Link>
          ))}
        </div>

        {/* Paginação — Carregar mais */}
        {!loading && pecas.length > 0 && (
          <div style={{ padding: `0 ${SPACING.XL} ${SPACING.XL}`, textAlign: 'center' }}>
            <p style={{ fontSize: '0.82rem', color: COLORS.MUTED_TEXT, marginBottom: SPACING.MD }}>
              {t('showing', { shown: pecas.length, total: totalPecas })}
            </p>
            {hasMore && (
              <button
                onClick={handleCarregarMais}
                disabled={loadingMore}
                style={{
                  ...BUTTON_PRIMARY_STYLE,
                  opacity: loadingMore ? 0.6 : 1,
                  cursor: loadingMore ? 'not-allowed' : 'pointer',
                  padding: '12px 32px',
                }}
              >
                {loadingMore ? t('loading') : t('loadMore')}
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
