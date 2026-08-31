import Money from '../components/Money';
import { useCurrency } from '../contexts/CurrencyContext';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useCart } from '../contexts/CartContext';
import { listarPecas, listarCategorias } from '../services/pecasService';
import { useLanguage } from '../contexts/LanguageContext';

const CATEGORIA_ICONS = {
  Motor: '⚙️', Lataria: '🚗', Elétrica: '🔌', Interior: '🪑',
  Suspensão: '🛞', Freios: '🛑', Transmissão: '⚡', Carroceria: '🔩',
};

const formatBRL = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function HomePage() {
  const navigate = useNavigate();
  const { addToCart, cartItems } = useCart();
  const { t } = useLanguage();
  const money = useCurrency();

  const [pecas, setPecas]           = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [stats, setStats]           = useState({ total: 0, categorias: 0 });
  const [loading, setLoading]       = useState(true);
  const [addedId, setAddedId]       = useState(null);
  const [heroSearch, setHeroSearch] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [pecasRes, cats] = await Promise.all([
          listarPecas({ sort: 'data_cadastro', order: 'desc', limit: 8 }),
          listarCategorias(),
        ]);
        const p = Array.isArray(pecasRes?.data) ? pecasRes.data : [];
        const c = Array.isArray(cats) ? cats : [];
        setPecas(p);
        setCategorias(c);
        setStats({ total: pecasRes?.total ?? p.length, categorias: c.length });
      } catch (e) {
        console.error('Erro ao carregar homepage:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleAddToCart = (peca) => {
    addToCart({
      id: peca.id, nome: peca.nome_peca, preco: Number(peca.preco),
      estoque: peca.estoque_atual ?? 0, imagem: peca.imagem || null,
      descricao: peca.historico_proveniencia || '', sku: peca.sku || '',
      peso_gramas: peca.peso_gramas, comprimento_mm: peca.comprimento_mm,
      largura_mm: peca.largura_mm, altura_mm: peca.altura_mm,
    });
    setAddedId(peca.id);
    setTimeout(() => setAddedId(null), 2000);
  };

  const jaNoCarrinho = (id) => cartItems.some((it) => it.id === id);

  const handleHeroSearch = (e) => {
    e.preventDefault();
    const q = heroSearch.trim();
    navigate(q ? `/buscaPecas?nome=${encodeURIComponent(q)}` : '/buscaPecas');
  };

  const destaque  = pecas.slice(0, 1)[0];
  const featured  = pecas.slice(0, 4);
  const recentes  = pecas.slice(4, 8);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />

      <main style={{ flex: 1 }}>

        {/* ── HERO ── */}
        <section className="bp-hero">
          <div className="bp-hero__bg" />
          <div className="bp-hero__glow" />

          {/* Conteúdo esquerdo */}
          <div className="bp-hero__content">
            <div className="bp-hero__tag">
              <span>◆</span> {t('marketplaceTag')}
            </div>

            <h1 className="bp-hero__title">
              {t('heroTitle')}
            </h1>

            <p className="bp-hero__sub">
              {t('heroSubtitle')}
            </p>

            <form className="bp-hero__search" onSubmit={handleHeroSearch}>
              <input
                type="text"
                value={heroSearch}
                onChange={(e) => setHeroSearch(e.target.value)}
                placeholder={t('homeSearchPlaceholder')}
              />
              <button type="submit" aria-label={t('exploreCatalog')} title={t('exploreCatalog')}>
                <SearchIcon />
              </button>
            </form>

            <div className="bp-hero__trust">
              {[
                t('verifiedListings'),
                t('adminApproval'),
                t('nicheCuration'),
              ].map((t) => (
                <span key={t} className="bp-hero__trust-item">
                  <span className="bp-hero__trust-dot" aria-hidden="true" /> {t}
                </span>
              ))}
            </div>
          </div>

          {/* Card destaque — lado direito */}
          <div className="bp-hero__card-wrapper">
            {loading ? (
              <div className="bp-hero__featured-card">
                <div className="skeleton" style={{ height: 180, borderRadius: 10, marginBottom: 16 }} />
                <div className="skeleton" style={{ height: 14, width: '50%', marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 22, width: '80%', marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 14, width: '60%' }} />
              </div>
            ) : destaque ? (
              <div className="bp-hero__featured-card" onClick={() => navigate(`/pecas/${destaque.id}`)} style={{ cursor: 'pointer' }}>
                <div className="bp-hero__featured-label">{t('featuredPart')}</div>
                <div className="bp-hero__featured-img">
                  {destaque.imagem
                    ? <img src={destaque.imagem} alt={destaque.nome_peca} />
                    : <CarIcon />
                  }
                </div>
                <div className="bp-hero__featured-sku">
                  SKU · {destaque.sku || `BP-${String(destaque.id).padStart(4,'0')}`}
                </div>
                <div className="bp-hero__featured-name">{destaque.nome_peca}</div>
                {destaque.condicao && (
                  <div className="bp-hero__featured-app">{destaque.condicao}</div>
                )}
                <div className="bp-hero__featured-footer">
                  <span className="bp-hero__featured-price"><Money value={destaque.preco_base ?? destaque.preco} currency={destaque.moeda_base || "BRL"} /></span>
                  <span className="badge badge-verified">{t('verified')}</span>
                </div>
              </div>
            ) : (
              <div className="bp-hero__featured-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: .5 }}><CarIcon /></div>
                <p style={{ color: 'rgba(255,255,255,.5)', fontSize: '.875rem' }}>{t('noRegisteredParts')}</p>
                <button className="btn btn-gold btn-sm" style={{ marginTop: '1rem' }} onClick={() => navigate('/cadastroPecas')}>
                  {t('registerPart')}
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ── CATEGORIAS ── */}
        <section className="bp-section">
          <div className="container">
            <div className="bp-section__header">
              <div>
                <h2 className="bp-section__title">{t('categories')}</h2>
                <p className="bp-section__sub">{t('exploreByType')}</p>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => navigate('/buscaPecas')}>
                {t('viewAll')}
              </button>
            </div>

            <div className="grid-cats">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="skeleton" style={{ height: 100, borderRadius: 12 }} />
                  ))
                : categorias.map((cat) => (
                    <div
                      key={cat.id}
                      className="cat-card"
                      onClick={() => navigate(`/buscaPecas?categoria_id=${cat.id}`)}
                    >
                      <div className="cat-card__icon">{CATEGORIA_ICONS[cat.nome] || '🔧'}</div>
                      <div className="cat-card__name">{t(cat.nome)}</div>
                    </div>
                  ))
              }
            </div>
          </div>
        </section>

        {/* ── PEÇAS EM DESTAQUE ── */}
        <section className="bp-section" style={{ background: 'rgba(0,0,0,.02)', borderTop: '1px solid var(--bp-border-light)', borderBottom: '1px solid var(--bp-border-light)' }}>
          <div className="container">
            <div className="bp-section__header">
              <div>
                <h2 className="bp-section__title">{t('featuredCatalog')}</h2>
                <p className="bp-section__sub">{t('recentParts')}</p>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => navigate('/buscaPecas?sort=data_cadastro&order=desc')}>
                {t('viewAll')}
              </button>
            </div>

            <div className="grid-auto">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                : featured.length > 0
                  ? featured.map((peca) => (
                      <PecaCard
                        key={peca.id}
                        peca={peca}
                        onDetail={() => navigate(`/pecas/${peca.id}`)}
                        onAdd={() => handleAddToCart(peca)}
                        added={addedId === peca.id}
                        inCart={jaNoCarrinho(peca.id)}
                      />
                    ))
                  : (
                      <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--bp-text-muted)' }}>
                        <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>{t('noPartsRegistered')}</p>
                        <button className="btn btn-primary" onClick={() => navigate('/cadastroPecas')}>
                          {t('registerFirstPart')}
                        </button>
                      </div>
                    )
              }
            </div>
          </div>
        </section>

        {/* ── ADICIONADAS RECENTEMENTE ── */}
        {(loading || recentes.length > 0) && (
          <section className="bp-section">
            <div className="container">
              <div className="bp-section__header">
                <div>
                  <h2 className="bp-section__title">{t('recentlyAdded')}</h2>
                  <p className="bp-section__sub">{t('latestParts')}</p>
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => navigate('/buscaPecas')}>
                  {t('viewCatalog')}
                </button>
              </div>

              <div className="grid-auto">
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                  : recentes.map((peca) => (
                      <PecaCard
                        key={peca.id}
                        peca={peca}
                        onDetail={() => navigate(`/pecas/${peca.id}`)}
                        onAdd={() => handleAddToCart(peca)}
                        added={addedId === peca.id}
                        inCart={jaNoCarrinho(peca.id)}
                      />
                    ))
                }
              </div>
            </div>
          </section>
        )}

        {/* ── FILTROS RÁPIDOS ── */}
        <section className="bp-section--sm">
          <div className="container">
            <h2 className="bp-section__title" style={{ marginBottom: '1rem' }}>{t('quickFilters')}</h2>
            <div className="flex flex-wrap gap-2">
              {[
                { label: t('cheapest'), url: '/buscaPecas?sort=preco&order=asc' },
                { label: t('mostExpensive'), url: '/buscaPecas?sort=preco&order=desc' },
                { label: t('mostRecent'), url: '/buscaPecas?sort=data_cadastro&order=desc' },
                { label: t('nosCondition'), url: '/buscaPecas?condicao=NOS' },
                { label: t('restoredCondition'), url: '/buscaPecas?condicao=Restaurada' },
                { label: '≤ ' + (money?.format(500) || formatBRL(500)), url: '/buscaPecas?max_preco=' + (money?.convert(500) ?? 500) },
                { label: '≥ ' + (money?.format(5000) || formatBRL(5000)), url: '/buscaPecas?min_preco=' + (money?.convert(5000) ?? 5000) },
              ].map(({ label, url }) => (
                <button key={label} className="btn btn-ghost btn-sm" onClick={() => navigate(url)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── STATS ── */}
        <section className="bp-section--sm">
          <div className="container">
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px),1fr))',
              gap: '1.25rem',
            }}>
              {[
                { value: loading ? '...' : stats.total, label: t('partsInCatalog'), icon: '🔩' },
                { value: loading ? '...' : stats.categorias, label: t('categories'), icon: '📂' },
                { value: t('history'), label: t('trackableOrders'), icon: '📦' },
                { value: t('direct'), label: t('sellerContact'), icon: '💬' },
              ].map(({ value, label, icon }) => (
                <div key={label} className="card card-pad" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.75rem', marginBottom: '.5rem' }}>{icon}</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--bp-text)', fontFamily: 'var(--font-serif)' }}>
                    {value}
                  </div>
                  <div style={{ fontSize: '.82rem', color: 'var(--bp-text-muted)', marginTop: '.25rem' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA FINAL ── */}
        <section className="bp-section">
          <div className="container">
            <div style={{
              background: 'linear-gradient(135deg, var(--bp-green-900) 0%, var(--bp-green-800) 70%)',
              borderRadius: 'var(--r-2xl)', padding: '3rem 2.5rem',
              textAlign: 'center', position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(circle at 80% 50%, rgba(201,168,76,.18), transparent 55%)',
              }} />
              <div style={{ position: 'relative', zIndex: 2 }}>
                <p className="label-sm" style={{ color: 'var(--bp-gold)', marginBottom: '.75rem' }}>
                  {t('sellerArea')}
                </p>
                <h2 style={{
                  fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.4rem,3vw,2rem)',
                  color: '#fff', margin: '0 0 .75rem',
                }}>
                  {t('havePartsToSell')}
                </h2>
                <p style={{ color: 'rgba(255,255,255,.75)', marginBottom: '1.75rem', maxWidth: 480, margin: '0 auto 1.75rem' }}>
                  {t('sellerCtaDescription')}
                </p>
                <button className="btn btn-gold btn-lg" onClick={() => navigate('/cadastroPecas')}>
                  {t('registerPartNow')}
                </button>
              </div>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}

/* ── Sub-componentes ── */

function PecaCard({ peca, onDetail, onAdd, added, inCart }) {
  const { t } = useLanguage();
  const money = useCurrency();
  const semEstoque = Number(peca.estoque_atual) === 0;

  return (
    <article className="product-card">
      <div className="product-card__image" onClick={onDetail}>
        {peca.imagem
          ? <img src={peca.imagem} alt={peca.nome_peca} />
          : <CarIconGold />
        }
        {peca.condicao && (
          <span className="badge badge-dark" style={{ position: 'absolute', top: 10, left: 10 }}>
            {peca.condicao}
          </span>
        )}
        {semEstoque && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="badge badge-error">{t('outOfStock')}</span>
          </div>
        )}
      </div>

      <div className="product-card__body">
        {peca.sku && (
          <div className="product-card__sku">SKU · {peca.sku}</div>
        )}
        <div className="product-card__name" onClick={onDetail} style={{ cursor: 'pointer' }}>
          {peca.nome_peca}
        </div>

        <div className="product-card__footer">
          <span className="product-card__price"><Money value={peca.preco_base ?? peca.preco} currency={peca.moeda_base || "BRL"} /></span>
          <span
            className={`badge ${semEstoque ? 'badge-error' : 'badge-verified'}`}
          >
            {semEstoque ? t('unavailable') : t('units', { value: peca.estoque_atual })}
          </span>
        </div>

        <div className="flex gap-2" style={{ marginTop: '.75rem' }}>
          <button className="btn btn-outline btn-sm flex-1" onClick={onDetail}>
            {t('viewDetail')}
          </button>
          <button
            className={`btn btn-sm flex-1 ${added ? '' : 'btn-primary'}`}
            style={added ? { background: 'var(--bp-success)', color: '#fff' } : {}}
            onClick={onAdd}
            disabled={semEstoque || added}
          >
            {added ? t('added') : inCart ? t('inCart') : `+ ${t('cart')}`}
          </button>
        </div>
      </div>
    </article>
  );
}

function SkeletonCard() {
  return (
    <div className="product-card" style={{ cursor: 'default' }}>
      <div className="skeleton" style={{ height: 200 }} />
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
        <div className="skeleton" style={{ height: 13, width: '45%' }} />
        <div className="skeleton" style={{ height: 18, width: '80%' }} />
        <div className="skeleton" style={{ height: 14, width: '60%' }} />
        <div className="flex gap-2" style={{ marginTop: '.5rem' }}>
          <div className="skeleton flex-1" style={{ height: 34 }} />
          <div className="skeleton flex-1" style={{ height: 34 }} />
        </div>
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function CarIcon() {
  return (
    <svg width="80" height="48" viewBox="0 0 200 80" fill="none" stroke="rgba(201,168,76,.5)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M30 55 Q50 25 80 20 H140 Q165 20 180 40 L190 55" />
      <circle cx="55" cy="60" r="14" /><circle cx="145" cy="60" r="14" />
      <path d="M30 55 H190 Q200 55 200 45 V40 H30 Q20 40 20 50 V55 Z" />
    </svg>
  );
}

function CarIconGold() {
  return (
    <svg width="80" height="48" viewBox="0 0 200 80" fill="none" stroke="rgba(201,168,76,.6)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M30 55 Q50 25 80 20 H140 Q165 20 180 40 L190 55" />
      <circle cx="55" cy="60" r="14" /><circle cx="145" cy="60" r="14" />
      <path d="M30 55 H190 Q200 55 200 45 V40 H30 Q20 40 20 50 V55 Z" />
    </svg>
  );
}
