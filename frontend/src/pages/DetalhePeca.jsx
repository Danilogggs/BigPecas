import Money from '../components/Money';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../components/Header';
import { AppIcon } from '../components/Icons';
import { useCart } from '../contexts/CartContext';
import {
  buscarAvaliacoesFornecedor,
  buscarAvaliacoesProduto,
} from '../services/avaliacoesService';
import {
  adicionarPecaWish,
  buscarFornecedoresRecomendados,
  buscarPecaPorId,
  buscarRecomendacoesPorPeca,
  buscarStatusWish,
  listarCategorias,
  listarMateriais,
  removerPecaWish,
} from '../services/pecasService';
import { buscarUsuarioPorId } from '../services/usuarioService';
import {
  BORDER_RADIUS,
  BUTTON_PRIMARY_STYLE,
  BUTTON_SECONDARY_STYLE,
  COLORS,
  SHADOWS,
  SPACING,
} from '../styles/theme';
import { parseUnexpectedError } from '../utils/friendlyErrors';
import { useLanguage } from '../contexts/LanguageContext';
import { buscarNomeOpcao as buscarNome } from '../features/pecas/domain/peca';
import {
  formatarDataPeca as formatarData,
  formatarPrecoPeca as formatarPreco,
} from '../features/pecas/presentation/pecaPresentation';

function InfoItem({ label, value }) {
  const { t } = useLanguage();
  return (
    <div
      style={{
        padding: SPACING.MD,
        backgroundColor: 'var(--bp-surface-muted)',
        borderRadius: BORDER_RADIUS.MD,
        border: '1px solid var(--bp-border-light)',
      }}
    >
      <div
        style={{
          color: 'var(--bp-text-muted)',
          fontSize: '0.78rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          marginBottom: '0.3rem',
        }}
      >
        {label}
      </div>
      <div style={{ color: COLORS.DARK_TEXT, fontWeight: 700, lineHeight: 1.4 }}>
        {value || t('noInfo')}
      </div>
    </div>
  );
}

function TextSection({ title, children }) {
  const { t } = useLanguage();
  return (
    <section
      style={{
        backgroundColor: 'var(--bp-surface)',
        borderRadius: BORDER_RADIUS.LG,
        boxShadow: SHADOWS.SM,
        border: '1px solid rgba(123, 29, 46, 0.12)',
        padding: SPACING.XL,
      }}
    >
      <h2
        style={{
          color: COLORS.DARK_TEXT,
          fontSize: '1.1rem',
          margin: `0 0 ${SPACING.SM}`,
        }}
      >
        {title}
      </h2>
      <p style={{ margin: 0, color: 'var(--bp-text-muted)', lineHeight: 1.7 }}>
        {children || t('noInfo')}
      </p>
    </section>
  );
}

function VendedorSection({ nome, fornecedorId, loading, error, onClick, onChatClick, notice, resumoAvaliacoes }) {
  const { t } = useLanguage();
  const textoNome = loading ? t('loading') : error || nome || t('seller');

  return (
    <section
      style={{
        backgroundColor: 'var(--bp-surface)',
        borderRadius: BORDER_RADIUS.LG,
        boxShadow: SHADOWS.SM,
        border: '1px solid rgba(123, 29, 46, 0.12)',
        padding: SPACING.XL,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: SPACING.LG,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h2
            style={{
              color: COLORS.DARK_TEXT,
              fontSize: '1.1rem',
              margin: `0 0 ${SPACING.SM}`,
            }}
          >
            {t('sellerLabel')}
          </h2>
          <p style={{ margin: 0, color: 'var(--bp-text-muted)', lineHeight: 1.6 }}>
            {textoNome}
          </p>
        </div>

        <div style={{ display: 'flex', gap: SPACING.SM, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onChatClick}
            disabled={!fornecedorId || loading}
            style={{
              ...BUTTON_PRIMARY_STYLE,
              opacity: !fornecedorId || loading ? 0.65 : 1,
              cursor: !fornecedorId || loading ? 'not-allowed' : 'pointer',
            }}
          >
            {t('openChat')}
          </button>

          <button
            type="button"
            onClick={onClick}
            disabled={!fornecedorId || loading}
            style={{
              ...BUTTON_SECONDARY_STYLE,
              opacity: !fornecedorId || loading ? 0.65 : 1,
              cursor: !fornecedorId || loading ? 'not-allowed' : 'pointer',
            }}
          >
            {t('viewSeller')}
          </button>
        </div>
      </div>

      <div
        style={{
          marginTop: SPACING.LG,
          paddingTop: SPACING.LG,
          borderTop: '1px solid var(--bp-border-light)',
          display: 'flex',
          justifyContent: 'space-between',
          gap: SPACING.MD,
          flexWrap: 'wrap',
          color: 'var(--bp-text-muted)',
          fontSize: '0.9rem',
          fontWeight: 700,
        }}
      >
        <span>{t('sellerRating')}</span>
        <span>
          {resumoAvaliacoes?.total > 0
            ? `★ ${Number(resumoAvaliacoes.media).toFixed(1)} (${resumoAvaliacoes.total})`
            : t('noReviews')}
        </span>
      </div>

      {notice && (
        <div
          style={{
            marginTop: SPACING.MD,
            color: COLORS.DARK_TEXT,
            fontWeight: 700,
            fontSize: '0.9rem',
          }}
        >
          {notice}
        </div>
      )}
    </section>
  );
}

function AvaliacoesProdutoSection({ resumo, avaliacoes }) {
  const { t } = useLanguage();
  return (
    <section
      style={{
        backgroundColor: 'var(--bp-surface)',
        borderRadius: BORDER_RADIUS.LG,
        boxShadow: SHADOWS.SM,
        border: '1px solid rgba(123, 29, 46, 0.12)',
        padding: SPACING.XL,
      }}
    >
      <h2 style={{ color: COLORS.DARK_TEXT, fontSize: '1.1rem', margin: `0 0 ${SPACING.SM}` }}>
        {t('productReviews')}
      </h2>

      {resumo.total > 0 ? (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: SPACING.LG }}>
            <strong style={{ color: '#C69216', fontSize: '1.35rem' }}>
              ★ {Number(resumo.media).toFixed(1)}
            </strong>
            <span style={{ color: 'var(--bp-text-muted)' }}>
              {resumo.total} {resumo.total === 1 ? t('verifiedReviews') : t('verifiedReviewsPlural')}
            </span>
          </div>
          <div style={{ display: 'grid', gap: SPACING.SM }}>
            {avaliacoes.map((avaliacao) => (
              <article
                key={avaliacao.id}
                style={{ padding: SPACING.MD, border: '1px solid var(--bp-border-light)', borderRadius: BORDER_RADIUS.MD, background: 'var(--bp-surface-muted)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <strong style={{ color: '#C69216' }}>
                    {'★'.repeat(avaliacao.nota)}{'☆'.repeat(5 - avaliacao.nota)}
                  </strong>
                  <span style={{ color: '#21734A', fontSize: '0.78rem', fontWeight: 800 }}>
                    {t('verifiedPurchase')}
                  </span>
                </div>
                {avaliacao.comentario && (
                  <p style={{ margin: `${SPACING.SM} 0 0`, color: 'var(--bp-text-muted)', lineHeight: 1.6 }}>
                    {avaliacao.comentario}
                  </p>
                )}
              </article>
            ))}
          </div>
        </>
      ) : (
        <p style={{ margin: 0, color: 'var(--bp-text-muted)', lineHeight: 1.7 }}>
          {t('noProductReviews')}
        </p>
      )}
    </section>
  );
}

export default function DetalhePeca() {
  const { formatDate, t } = useLanguage();
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, removeFromCart, cartItems } = useCart();

  const [peca, setPeca] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [materiais, setMateriais] = useState([]);
  const [fornecedor, setFornecedor] = useState(null);
  const [loadingFornecedor, setLoadingFornecedor] = useState(false);
  const [fornecedorError, setFornecedorError] = useState('');
  const [fornecedorNotice, setFornecedorNotice] = useState('');
  const [recomendacoes, setRecomendacoes] = useState([]);
  const [loadingRecomendacoes, setLoadingRecomendacoes] = useState(false);
  const [fornecedoresRecomendados, setFornecedoresRecomendados] = useState([]);
  const [loadingFornecedoresRecomendados, setLoadingFornecedoresRecomendados] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [salvoNaWish, setSalvoNaWish] = useState(false);
  const [loadingWish, setLoadingWish] = useState(false);
  const [wishMessage, setWishMessage] = useState('');
  const [carrinhoMessage, setCarrinhoMessage] = useState('');
  const [itemNoCarrinho, setItemNoCarrinho] = useState(false);
  const [avaliacoesProduto, setAvaliacoesProduto] = useState([]);
  const [resumoProduto, setResumoProduto] = useState({ total: 0, media: 0 });
  const [resumoFornecedor, setResumoFornecedor] = useState({ total: 0, media: 0 });

  useEffect(() => {
    async function carregarDetalhes() {
      setLoading(true);
      setErrorMessage('');

      try {
        const [pecaData, categoriasData, materiaisData] = await Promise.all([
          buscarPecaPorId(id),
          listarCategorias(),
          listarMateriais(),
        ]);

        setPeca(pecaData);
        setCategorias(Array.isArray(categoriasData) ? categoriasData : []);
        setMateriais(Array.isArray(materiaisData) ? materiaisData : []);
      } catch (error) {
        setErrorMessage(parseUnexpectedError(error, t('partDetailsLoadFailed')));
      } finally {
        setLoading(false);
      }
    }

    carregarDetalhes();
  }, [id]);

  useEffect(() => {
    async function carregarStatusWish() {
      if (!peca?.id) {
        setSalvoNaWish(false);
        return;
      }

      try {
        const status = await buscarStatusWish(peca.id);
        setSalvoNaWish(Boolean(status?.in_wish));
      } catch (error) {
        console.error('Erro ao carregar status da lista de desejos:', error);
      }
    }

    carregarStatusWish();
  }, [peca?.id]);

  useEffect(() => {
    let ativo = true;

    async function carregarAvaliacoes() {
      const [produto, vendedor] = await Promise.all([
        buscarAvaliacoesProduto(id).catch(() => null),
        peca?.fornecedor_id
          ? buscarAvaliacoesFornecedor(peca.fornecedor_id).catch(() => null)
          : Promise.resolve(null),
      ]);

      if (!ativo) return;
      setAvaliacoesProduto(Array.isArray(produto?.avaliacoes) ? produto.avaliacoes : []);
      setResumoProduto(produto?.resumo || { total: 0, media: 0 });
      setResumoFornecedor(vendedor?.resumo || { total: 0, media: 0 });
    }

    carregarAvaliacoes();
    return () => { ativo = false; };
  }, [id, peca?.fornecedor_id]);

  useEffect(() => {
    async function carregarRecomendacoes() {
      if (!id) return;

      setLoadingRecomendacoes(true);

      try {
        const data = await buscarRecomendacoesPorPeca(id, 4);
        setRecomendacoes(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Erro ao carregar recomendações:', error);
        setRecomendacoes([]);
      } finally {
        setLoadingRecomendacoes(false);
      }
    }

    carregarRecomendacoes();
  }, [id]);

  useEffect(() => {
    async function carregarFornecedoresRecomendados() {
      setLoadingFornecedoresRecomendados(true);

      try {
        const data = await buscarFornecedoresRecomendados(4);
        setFornecedoresRecomendados(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Erro ao carregar fornecedores recomendados:', error);
        setFornecedoresRecomendados([]);
      } finally {
        setLoadingFornecedoresRecomendados(false);
      }
    }

    carregarFornecedoresRecomendados();
  }, []);

  useEffect(() => {
    async function carregarFornecedor() {
      if (!peca?.fornecedor_id) {
        setFornecedor(null);
        setFornecedorError('');
        setFornecedorNotice('');
        return;
      }

      setLoadingFornecedor(true);
      setFornecedorError('');
      setFornecedorNotice('');

      try {
        const usuario = await buscarUsuarioPorId(peca.fornecedor_id);
        setFornecedor(usuario?.profile || usuario);
      } catch (error) {
        setFornecedor(null);
        setFornecedorError(parseUnexpectedError(error, t('sellerLoadFailed')));
      } finally {
        setLoadingFornecedor(false);
      }
    }

    carregarFornecedor();
  }, [peca?.fornecedor_id]);

  useEffect(() => {
    // Verificar se o item já está no carrinho
    const jaNoCarrinho = cartItems.some((item) => item.id === peca?.id);
    setItemNoCarrinho(jaNoCarrinho);
  }, [peca?.id, cartItems]);

  useEffect(() => {
    if (!wishMessage) return undefined;
    const timer = window.setTimeout(() => setWishMessage(''), 3000);
    return () => window.clearTimeout(timer);
  }, [wishMessage]);

  useEffect(() => {
    if (!carrinhoMessage) return undefined;
    const timer = window.setTimeout(() => setCarrinhoMessage(''), 3000);
    return () => window.clearTimeout(timer);
  }, [carrinhoMessage]);

  const categoriaNome = useMemo(() => {
    if (peca?.categoria?.nome) return peca.categoria.nome;
    return buscarNome(categorias, peca?.categoria_id, t('categoryUnknown'));
  }, [categorias, peca]);

  const materialNome = useMemo(() => {
    if (peca?.material?.nome) return peca.material.nome;
    return buscarNome(materiais, peca?.material_id, t('noInfo'));
  }, [materiais, peca]);

  const nomeFornecedor = useMemo(() => {
    return fornecedor?.full_name || fornecedor?.nome || fornecedor?.nome_loja || fornecedor?.email || '';
  }, [fornecedor]);

  function handleFornecedorClick() {
    if (!peca?.fornecedor_id) return;
    navigate(`/vendedores/${peca.fornecedor_id}`);
  }

  function handleChatClick() {
    if (!peca?.fornecedor_id) return;
    navigate(`/chat/${peca.fornecedor_id}`);
  }

  async function handleToggleWish() {
    if (!peca?.id || loadingWish) return;

    setLoadingWish(true);
    setWishMessage('');

    try {
      if (salvoNaWish) {
        await removerPecaWish(peca.id);
        setSalvoNaWish(false);
        setWishMessage(t('removedWishlist'));
      } else {
        await adicionarPecaWish(peca.id);
        setSalvoNaWish(true);
        setWishMessage(t('addedWishlist'));
      }
    } catch (error) {
      setWishMessage(parseUnexpectedError(error, t('wishlistError')));
    } finally {
      setLoadingWish(false);
    }
  }

  function handleAddToCart() {
    if (!peca) return;

    if (itemNoCarrinho) {
      // Remover do carrinho
      removeFromCart(peca.id);
      setCarrinhoMessage(t('removedFromCart'));
    } else {
      // Validar se há estoque
      if (Number(peca.estoque_atual) <= 0) {
        setCarrinhoMessage(t('outOfStockMessage'));
        return;
      }

      // Preparar dados do item para o carrinho
      const itemParaCarrinho = {
        id: peca.id,
        nome: peca.nome_peca,
        descricao: peca.descricao,
        preco: peca.preco,
        imagem: peca.imagem,
        estoque: peca.estoque_atual,
        sku: peca.sku,
      };

      // Adicionar ao carrinho
      addToCart(itemParaCarrinho);
      setCarrinhoMessage(t('addedToCart'));
    }
  }

  function RecomendacoesSection() {
    if (loadingRecomendacoes) {
      return (
        <section
          style={{
            backgroundColor: 'var(--bp-surface)',
            borderRadius: BORDER_RADIUS.LG,
            boxShadow: SHADOWS.SM,
            border: '1px solid rgba(123, 29, 46, 0.12)',
            padding: SPACING.XL,
          }}
        >
          <h2
            style={{
              color: COLORS.DARK_TEXT,
              fontSize: '1.1rem',
              margin: `0 0 ${SPACING.SM}`,
            }}
          >
            {t('relatedParts')}
          </h2>

          <p style={{ margin: 0, color: 'var(--bp-text-muted)', lineHeight: 1.6 }}>
            {t('loadingRecommendations')}
          </p>
        </section>
      );
    }

    if (!recomendacoes.length) {
      return null;
    }

    return (
      <section
        style={{
          backgroundColor: 'var(--bp-surface)',
          borderRadius: BORDER_RADIUS.LG,
          boxShadow: SHADOWS.SM,
          border: '1px solid rgba(123, 29, 46, 0.12)',
          padding: SPACING.XL,
        }}
      >
        <h2
          style={{
            color: COLORS.DARK_TEXT,
            fontSize: '1.1rem',
            margin: `0 0 ${SPACING.SM}`,
          }}
        >
            {t('relatedParts')}
        </h2>

        <p
          style={{
            marginTop: 0,
            marginBottom: SPACING.LG,
            color: 'var(--bp-text-muted)',
            lineHeight: 1.6,
          }}
        >
          {t('recommendationsDescription')}
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
            gap: SPACING.LG,
          }}
        >
          {recomendacoes.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(`/pecas/${item.id}`)}
              style={{
                textAlign: 'left',
                backgroundColor: 'var(--bp-surface-muted)',
                border: '1px solid var(--bp-border-light)',
                borderRadius: BORDER_RADIUS.MD,
                padding: SPACING.MD,
                cursor: 'pointer',
              }}
            >
              {item.imagem && (
                <img
                  src={item.imagem}
                  alt={item.nome_peca || t('recommendedPartImage')}
                  style={{
                    width: '100%',
                    height: 120,
                    objectFit: 'cover',
                    borderRadius: BORDER_RADIUS.MD,
                    marginBottom: SPACING.SM,
                  }}
                />
              )}

              <strong
                style={{
                  color: COLORS.DARK_TEXT,
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                {item.nome_peca || t('unnamedPart')}
              </strong>

              <span style={{ color: COLORS.DARK_TEXT, fontWeight: 700 }}>
                <Money value={item.preco_base ?? item.preco} currency={item.moeda_base || "BRL"} />
              </span>

              <div
                style={{
                  marginTop: 8,
                  color: 'var(--bp-text-muted)',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                }}
              >
                  {t('compatibility')}: {item.score_recomendacao} {t('points')}
              </div>
            </button>
          ))}
        </div>
      </section>
    );
  }

  function FornecedoresRecomendadosSection() {
    if (loadingFornecedoresRecomendados) {
      return (
        <section
          style={{
            backgroundColor: 'var(--bp-surface)',
            borderRadius: BORDER_RADIUS.LG,
            boxShadow: SHADOWS.SM,
            border: '1px solid rgba(123, 29, 46, 0.12)',
            padding: SPACING.XL,
          }}
        >
          <h2
            style={{
              color: COLORS.DARK_TEXT,
              fontSize: '1.1rem',
              margin: `0 0 ${SPACING.SM}`,
            }}
          >
            {t('recommendedSellers')}
          </h2>
          <p style={{ margin: 0, color: 'var(--bp-text-muted)', lineHeight: 1.6 }}>
            {t('loadingSellers')}
          </p>
        </section>
      );
    }

    if (!fornecedoresRecomendados.length) {
      return null;
    }

    return (
      <section
        style={{
          backgroundColor: 'var(--bp-surface)',
          borderRadius: BORDER_RADIUS.LG,
          boxShadow: SHADOWS.SM,
          border: '1px solid rgba(123, 29, 46, 0.12)',
          padding: SPACING.XL,
        }}
      >
        <h2
          style={{
            color: COLORS.DARK_TEXT,
            fontSize: '1.1rem',
            margin: `0 0 ${SPACING.SM}`,
          }}
        >
          {t('recommendedSellers')}
        </h2>

        <p
          style={{
            marginTop: 0,
            marginBottom: SPACING.LG,
            color: 'var(--bp-text-muted)',
            lineHeight: 1.6,
          }}
        >
          {t('recommendedSellersDescription')}
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
            gap: SPACING.LG,
          }}
        >
          {fornecedoresRecomendados.map((fornecedorItem) => {
              const nome =
              fornecedorItem.nome_loja ||
              fornecedorItem.full_name ||
              fornecedorItem.email ||
                t('seller');

            return (
              <button
                key={fornecedorItem.id}
                type="button"
                onClick={() => navigate(`/vendedores/${fornecedorItem.id}`)}
                style={{
                  textAlign: 'left',
                  backgroundColor: 'var(--bp-surface-muted)',
                  border: '1px solid var(--bp-border-light)',
                  borderRadius: BORDER_RADIUS.MD,
                  padding: SPACING.MD,
                  cursor: 'pointer',
                }}
              >
                <strong
                  style={{
                    color: COLORS.DARK_TEXT,
                    display: 'block',
                    marginBottom: 6,
                  }}
                >
                  {nome}
                </strong>

                <div style={{ color: 'var(--bp-text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                  {fornecedorItem.descricao_loja || t('sellerDescriptionFallback')}
                </div>

                <div
                  style={{
                    marginTop: SPACING.SM,
                    color: COLORS.DARK_TEXT,
                    fontSize: '0.9rem',
                    fontWeight: 800,
                  }}
                >
                  ★ {Number(fornecedorItem.media_avaliacoes || 0).toFixed(1)} • {fornecedorItem.total_avaliacoes || 0} {t((fornecedorItem.total_avaliacoes || 0) === 1 ? 'verifiedReviews' : 'verifiedReviewsPlural')}
                </div>

                <div
                  style={{
                    marginTop: 8,
                    color: 'var(--bp-text-muted)',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                  }}
                >
                  {fornecedorItem.total_pecas} {t('productsLabel').toLowerCase()} • {fornecedorItem.pecas_com_estoque} {t('stockLabel').toLowerCase()}
                </div>
              </button>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <div className="detalhe-peca-page" style={{ minHeight: '100vh', backgroundColor: COLORS.CREAM, color: COLORS.DARK_TEXT }}>
      <style>{`
        @media (max-width: 860px) {
          .detalhe-peca-hero {
            grid-template-columns: 1fr !important;
          }

          .detalhe-peca-info-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <Header />

      <main style={{ padding: SPACING.XL }}>
        <div
          style={{
            maxWidth: 1160,
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: SPACING.LG,
          }}
        >
          <div style={{ display: 'flex', gap: SPACING.SM, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => navigate('/buscaPecas')}
              style={BUTTON_SECONDARY_STYLE}
            >
              {t('backToSearch')}
            </button>
          </div>

          {loading && (
            <div style={{ color: COLORS.DARK_TEXT, fontWeight: 700 }}>
              {t('loadingPartDetails')}
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

          {!loading && !errorMessage && peca && (
            <>
              <section
                className="detalhe-peca-hero"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(300px, 0.85fr) minmax(320px, 1.15fr)',
                  gap: SPACING.XL,
                  alignItems: 'stretch',
                }}
              >
                <div
                  style={{
                    minHeight: 360,
                    backgroundColor: '#EFE2C6',
                    borderRadius: BORDER_RADIUS.LG,
                    overflow: 'hidden',
                    border: '1px solid rgba(123, 29, 46, 0.12)',
                    boxShadow: SHADOWS.SM,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {peca.url_video && <video src={peca.url_video} controls preload="metadata" style={{width:"100%",maxHeight:320}} />}
                  {peca.imagem ? (
                    <img
                      src={peca.imagem}
                      alt={peca.nome_peca || t('partImage')}
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
                        color: 'var(--bp-on-light)',
                        fontWeight: 800,
                        textAlign: 'center',
                        padding: SPACING.XL,
                      }}
                    >
                      {t('noRegisteredImage')}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    backgroundColor: 'var(--bp-surface)',
                    borderRadius: BORDER_RADIUS.LG,
                    boxShadow: SHADOWS.SM,
                    border: '1px solid rgba(123, 29, 46, 0.12)',
                    padding: SPACING.XL,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: SPACING.LG,
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: SPACING.MD,
                        alignItems: 'flex-start',
                        flexWrap: 'wrap',
                      }}
                    >
                      <h1
                        style={{
                          color: COLORS.DARK_TEXT,
                          fontFamily: 'var(--font-serif)',
                          fontSize: '2rem',
                          lineHeight: 1.15,
                          margin: 0,
                        }}
                      >
                        {peca.nome_peca || t('unnamedPart')}
                      </h1>

                      <span
                        style={{
                          backgroundColor: '#F8E9C5',
                          color: 'var(--bp-on-light)',
                          borderRadius: BORDER_RADIUS.FULL,
                          padding: '0.35rem 0.8rem',
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {peca.condicao || 'N/I'}
                      </span>
                    </div>

                    <p style={{ margin: `${SPACING.SM} 0 0`, color: 'var(--bp-text-sub)' }}>
                      {t(categoriaNome)} / {t(materialNome)}
                    </p>
                  </div>

                  <div
                    style={{
                      borderTop: '1px solid var(--bp-border-light)',
                      borderBottom: '1px solid var(--bp-border-light)',
                      padding: `${SPACING.LG} 0`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: SPACING.LG,
                      flexWrap: 'wrap',
                    }}
                  >
                    <strong style={{ color: COLORS.DARK_TEXT, fontSize: '1.7rem' }}>
                      <Money value={peca.preco_base ?? peca.preco} currency={peca.moeda_base || "BRL"} />
                    </strong>

                    <span
                      style={{
                        color: Number(peca.estoque_atual) > 0 ? COLORS.SUCCESS_DARK : '#991B1B',
                        backgroundColor: Number(peca.estoque_atual) > 0 ? COLORS.SUCCESS : COLORS.ERROR,
                        borderRadius: BORDER_RADIUS.FULL,
                        padding: '0.45rem 0.85rem',
                        fontSize: '0.85rem',
                        fontWeight: 800,
                      }}
                    >
                      {t('stockLabel')}: {peca.estoque_atual ?? 0}
                    </span>
                  </div>

                  <div
                    className="detalhe-peca-info-grid"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                      gap: SPACING.MD,
                    }}
                  >
                    <InfoItem label="SKU" value={peca.sku} />
                    <InfoItem label="OEM" value={peca.oem_number} />
                    <InfoItem label={t('serialNumber')} value={peca.num_serie} />
                    <InfoItem label={t('registration')} value={formatarData(peca.data_cadastro || peca.created_at, formatDate)} />
                  </div>

                  <div style={{ display: 'flex', gap: SPACING.MD, flexWrap: 'wrap', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      style={{
                        ...BUTTON_SECONDARY_STYLE,
                        alignSelf: 'flex-start',
                        backgroundColor: itemNoCarrinho ? 'var(--bp-primary-action)' : 'transparent',
                        color: itemNoCarrinho ? 'var(--bp-on-primary)' : 'var(--bp-action-text)',
                      }}
                    >
                      <AppIcon name="cart" size={18} /> {itemNoCarrinho ? t('removeFromCart') : t('addToCart')}
                    </button>

                    <button
                      type="button"
                      onClick={handleToggleWish}
                      disabled={loadingWish}
                      style={{
                        ...BUTTON_SECONDARY_STYLE,
                        alignSelf: 'flex-start',
                        backgroundColor: salvoNaWish ? 'var(--bp-primary-action)' : 'transparent',
                        color: salvoNaWish ? 'var(--bp-on-primary)' : 'var(--bp-action-text)',
                        opacity: loadingWish ? 0.65 : 1,
                        cursor: loadingWish ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <AppIcon name="heart" size={18} filled={salvoNaWish} /> {salvoNaWish ? t('removeFromWishlist') : t('addToWishlist')}
                    </button>
                  </div>

                  {wishMessage && (
                    <div
                      style={{
                        color: 'var(--bp-on-light)',
                        backgroundColor: '#FFF7D6',
                        border: '1px solid #F0C060',
                        borderRadius: BORDER_RADIUS.MD,
                        padding: SPACING.SM,
                        fontWeight: 700,
                      }}
                    >
                      {wishMessage}
                    </div>
                  )}

                  {carrinhoMessage && (
                    <div
                      style={{
                        color: 'var(--bp-on-light)',
                        backgroundColor: '#FFF7D6',
                        border: '1px solid #F0C060',
                        borderRadius: BORDER_RADIUS.MD,
                        padding: SPACING.SM,
                        fontWeight: 700,
                      }}
                    >
                      {carrinhoMessage}
                    </div>
                  )}
                </div>
              </section>

              <VendedorSection
                nome={nomeFornecedor}
                fornecedorId={peca.fornecedor_id}
                loading={loadingFornecedor}
                error={fornecedorError}
                onClick={handleFornecedorClick}
                onChatClick={handleChatClick}
                notice={fornecedorNotice}
                resumoAvaliacoes={resumoFornecedor}
              />

              <AvaliacoesProdutoSection
                resumo={resumoProduto}
                avaliacoes={avaliacoesProduto}
              />

              <RecomendacoesSection />

              <FornecedoresRecomendadosSection />

              <section
                className="detalhe-peca-info-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                  gap: SPACING.MD,
                }}
              >
                <InfoItem label={t('weight')} value={peca.peso_gramas ? `${peca.peso_gramas} g` : ''} />
                <InfoItem label={t('length')} value={peca.comprimento_mm ? `${peca.comprimento_mm} mm` : ''} />
                <InfoItem label={t('width')} value={peca.largura_mm ? `${peca.largura_mm} mm` : ''} />
                <InfoItem label={t('height')} value={peca.altura_mm ? `${peca.altura_mm} mm` : ''} />
              </section>

              <TextSection title={t('detailsOfEngraving')}>
                {peca.detalhes_gravacao}
              </TextSection>

              <TextSection title={t('provenanceHistory')}>
                {peca.historico_proveniencia}
              </TextSection>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
