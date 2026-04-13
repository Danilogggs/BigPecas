import { useNavigate } from 'react-router-dom';
import { products } from '../data/mockData';
import PageLayout from '../components/layouts/PageLayout';
import styles from './HomePage.module.css';

const categories = ['Motor', 'Freios', 'Suspensão', 'Interior', 'Lataria', 'Elétrica'];

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <PageLayout>
      <main style={{ flex: 1 }}>

        {/* ── HERO ── */}
        <div className={styles.section}>
          <div className={styles.hero}>
            {/* Texto */}
            <div>
              <span className={styles.heroBadge}>Catálogo de peças usadas</span>
              <h2 className={styles.heroTitle}>
                Encontre peças de carros antigos com confiança na compra.
              </h2>
              <p className={styles.heroSubtitle}>
                Um catálogo organizado de peças automotivas usadas, com credibilidade, qualidade e estilo que remete à elegância dos clássicos.
              </p>

              <div className={styles.heroActions}>
                <button className={styles.btnHeroPrimary} onClick={() => navigate('/buscaPecas')}>
                  Ver catálogo
                </button>
                <button className={styles.btnHeroOutline} onClick={() => navigate('/cadastroPecas')}>
                  Anunciar peça
                </button>
              </div>

              {/* Stats */}
              <div className={styles.statsGrid}>
                {[
                  ['2.500+', 'Peças cadastradas'],
                  ['320+', 'Modelos atendidos'],
                  ['98%', 'Avaliação positiva'],
                ].map(([value, label]) => (
                  <div key={label} className={styles.statCard}>
                    <p className={styles.statValue}>{value}</p>
                    <p className={styles.statLabel}>{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick search card */}
            <div className={styles.quickSearchCard}>
              <div className={styles.quickSearchInner}>
                <div className={styles.quickSearchHeader}>
                  <div>
                    <p className={styles.quickSearchEyebrow}>Painel principal</p>
                    <h3 className={styles.quickSearchTitle}>Busca rápida</h3>
                  </div>
                  <span className={styles.onlineBadge}>Online</span>
                </div>

                <div className={styles.quickSearchFields}>
                  <input
                    className={styles.quickInput}
                    placeholder="Pesquisar peça, modelo ou código"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        navigate(`/buscaPecas?nome=${encodeURIComponent(e.target.value.trim())}`);
                      }
                    }}
                  />
                  <div className={styles.quickSelects}>
                    <select className={styles.quickSelect}>
                      <option>Categoria</option>
                      <option>Motor</option>
                      <option>Interior</option>
                      <option>Lataria</option>
                    </select>
                    <select className={styles.quickSelect}>
                      <option>Condição</option>
                      <option>Original</option>
                      <option>Restaurado</option>
                      <option>Usado</option>
                    </select>
                  </div>
                  <button className={styles.btnQuickSearch} onClick={() => navigate('/buscaPecas')}>
                    Buscar peças
                  </button>
                </div>

                <div className={styles.quickResult}>
                  <p className={styles.quickResultLabel}>Exemplo de resultado</p>
                  <div className={styles.quickResultRow}>
                    <div>
                      <p className={styles.quickResultName}>Carburador Weber 460</p>
                      <p className={styles.quickResultMeta}>Chevette • Revisado • Estoque 3</p>
                    </div>
                    <p className={styles.quickResultPrice}>R$ 590</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── CATEGORIAS ── */}
        <div className={`${styles.section} ${styles.categoriesSection}`}>
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <div>
                <p className={styles.sectionEyebrow}>Categorias</p>
                <h3 className={styles.sectionTitle}>Navegue pelo catálogo</h3>
              </div>
              <button className={styles.btnViewAll} onClick={() => navigate('/buscaPecas')}>
                Ver todas
              </button>
            </div>

            <div className={styles.categoriesGrid}>
              {categories.map((cat) => (
                <button key={cat} className={styles.categoryBtn} onClick={() => navigate('/buscaPecas')}>
                  <div className={styles.categoryIcon} />
                  <p className={styles.categoryName}>{cat}</p>
                  <p className={styles.categoryHint}>Peças selecionadas</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── PEÇAS EM DESTAQUE ── */}
        <div className={`${styles.section} ${styles.productsSection}`}>
          <div className={styles.productsSectionHeader}>
            <div>
              <p className={styles.sectionEyebrow}>Destaques</p>
              <h3 className={styles.sectionTitle}>Peças em evidência</h3>
            </div>
            <p className={styles.productsSectionNote}>
              Seleção especial para restauradores exigentes
            </p>
          </div>

          <div className={styles.productsGrid}>
            {products.map((product) => (
              <article key={product.name} className={styles.productCard}>
                <div className={styles.productImageWrap}>
                  <div className={styles.productImagePlaceholder} />
                </div>
                <div className={styles.productBody}>
                  <div className={styles.productMeta}>
                    <div>
                      <p className={styles.productApplication}>{product.application}</p>
                      <h4 className={styles.productName}>{product.name}</h4>
                    </div>
                    {product.tag && <span className={styles.productTag}>{product.tag}</span>}
                  </div>
                  <div className={styles.productPriceRow}>
                    <p className={styles.productPrice}>{product.price}</p>
                    <p className={styles.productCondition}>Usada</p>
                  </div>
                  <button className={styles.btnProductDetails} onClick={() => navigate('/login')}>
                    Ver detalhes
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* ── CTA ── */}
        <div className={`${styles.section} ${styles.ctaSection}`}>
          <div className={styles.ctaBox}>
            <div className={styles.ctaGrid}>
              <div>
                <p className={styles.ctaEyebrow}>Seu sistema com personalidade</p>
                <h3 className={styles.ctaTitle}>Um visual clássico para peças especiais.</h3>
                <p className={styles.ctaText}>
                  Cadastre e venda suas peças no maior catálogo de automóveis clássicos do Brasil.
                </p>
              </div>
              <button className={styles.btnCta} onClick={() => navigate('/cadastroPecas')}>
                Anunciar peça
              </button>
            </div>
          </div>
        </div>

      </main>
    </PageLayout>
  );
}
