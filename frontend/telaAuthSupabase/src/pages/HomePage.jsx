import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { useCart } from '../contexts/CartContext';
import { listarPecas, listarCategorias } from '../services/pecasService';

const BORDEAUX = '#7B1D2E';
const DEEP_BORDEAUX = '#4E0F1C';
const CREAM = '#F5EDD8';
const HIGHLIGHT = '#F0C060';
const DARK = '#2C1A17';
const MUTED = '#6A5F58';
const BORDER = '#E5DCC5';

const formatBRL = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const CATEGORIA_ICONS = {
  Motor: '⚙️', Lataria: '🚗', Elétrica: '🔌', Interior: '🪑',
  Suspensão: '🛞', Freios: '🛑', Transmissão: '⚡', Carroceria: '🔩',
};

export default function HomePage() {
  const navigate = useNavigate();
  const { addToCart, cartItems } = useCart();
  const [activeNav, setActiveNav] = useState('catalog');

  const [pecasDestaque, setPecasDestaque] = useState([]);
  const [pecasRecentes, setPecasRecentes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [stats, setStats] = useState({ total: 0, categorias: 0 });
  const [loading, setLoading] = useState(true);
  const [addedId, setAddedId] = useState(null);

  useEffect(() => {
    async function carregar() {
      setLoading(true);
      try {
        const [todasPecas, cats] = await Promise.all([
          listarPecas({ sort: 'data_cadastro', order: 'desc' }),
          listarCategorias(),
        ]);

        const pecas = Array.isArray(todasPecas) ? todasPecas : [];
        const categoriasData = Array.isArray(cats) ? cats : [];

        setPecasDestaque(pecas.slice(0, 4));
        setPecasRecentes(pecas.slice(4, 8));
        setCategorias(categoriasData);
        setStats({ total: pecas.length, categorias: categoriasData.length });
      } catch (err) {
        console.error('Erro ao carregar homepage:', err);
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, []);

  const handleAddToCart = (peca) => {
    addToCart({
      id: peca.id,
      nome: peca.nome_peca,
      preco: Number(peca.preco),
      estoque: peca.estoque_atual ?? 0,
      imagem: peca.imagem || null,
      descricao: peca.historico_proveniencia || '',
      sku: peca.sku || '',
      peso_gramas: peca.peso_gramas,
      comprimento_mm: peca.comprimento_mm,
      largura_mm: peca.largura_mm,
      altura_mm: peca.altura_mm,
    });
    setAddedId(peca.id);
    setTimeout(() => setAddedId(null), 2000);
  };

  const jaNoCarrinho = (id) => cartItems.some((it) => it.id === id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: CREAM }}>
      <style>{`
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .skeleton {
          background: linear-gradient(90deg, #efe6cf, #f7efd9, #efe6cf);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
          border-radius: 8px;
        }
        .peca-card { transition: transform 0.2s, box-shadow 0.2s; }
        .peca-card:hover { transform: translateY(-4px); box-shadow: 0 12px 28px rgba(123,29,46,0.14); }
        .cat-card { transition: transform 0.22s, box-shadow 0.22s, border-color 0.22s; cursor: pointer; }
        .cat-card:hover { transform: translateY(-4px); box-shadow: 0 10px 22px rgba(123,29,46,0.12); border-color: ${BORDEAUX} !important; }
      `}</style>

      <Header />

      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar activeNav={activeNav} setActiveNav={setActiveNav} />

        <main style={{ flex: 1, overflowY: 'auto', background: `linear-gradient(180deg, #F5EDD8 0%, #FFF8EA 45%, #F5EDD8 100%)` }}>

          {/* HERO */}
          <section style={{
            position: 'relative',
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1.2fr) minmax(260px,0.8fr)',
            gap: '2.5rem',
            alignItems: 'center',
            padding: 'clamp(2rem,5vw,4rem) 2.5rem',
            background: `radial-gradient(circle at 20% 20%, rgba(240,192,96,0.24), transparent 30%), linear-gradient(135deg, ${DEEP_BORDEAUX} 0%, ${BORDEAUX} 58%, #9B2A3E 100%)`,
            minHeight: 340,
            overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: `url('https://images.unsplash.com/photo-1591278169757-deac26e49555?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080')`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.14 }} />

            <div style={{ position: 'relative', zIndex: 2 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.85rem', borderRadius: '9999px', color: HIGHLIGHT, backgroundColor: 'rgba(255,255,255,0.10)', border: '1px solid rgba(240,192,96,0.35)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Marketplace automotivo vintage
              </span>
              <h1 style={{ margin: '1.5rem 0 1rem', color: HIGHLIGHT, fontFamily: "'Georgia', serif", fontSize: 'clamp(1.8rem,4vw,3.2rem)', lineHeight: 1.05, fontWeight: 800, letterSpacing: '-1px' }}>
                Encontre peças para restaurar clássicos com confiança.
              </h1>
              <p style={{ fontSize: '1rem', maxWidth: '40rem', color: 'rgba(255,255,255,0.88)', lineHeight: 1.7, margin: 0 }}>
                Busque por nome, categoria, preço e condição. Catálogo real atualizado em tempo real.
              </p>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
                <button onClick={() => navigate('/buscaPecas')} style={{ padding: '0.85rem 1.5rem', borderRadius: '9999px', fontSize: '0.9rem', backgroundColor: HIGHLIGHT, color: BORDEAUX, fontWeight: 800, border: 'none', cursor: 'pointer', boxShadow: '0 14px 28px rgba(0,0,0,0.18)', transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.9'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                  Explorar catálogo
                </button>
                <button onClick={() => navigate('/cadastroPecas')} style={{ padding: '0.85rem 1.5rem', borderRadius: '9999px', fontSize: '0.9rem', backgroundColor: 'rgba(255,255,255,0.10)', color: CREAM, border: '1.5px solid rgba(255,255,255,0.45)', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.18)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.10)'}>
                  Anunciar peça
                </button>
              </div>
            </div>

            {/* Stats card */}
            <div style={{ position: 'relative', zIndex: 2, backgroundColor: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.24)', borderRadius: '1.5rem', padding: '1.5rem', backdropFilter: 'blur(10px)', boxShadow: '0 24px 60px rgba(0,0,0,0.22)' }}>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: '1rem', marginBottom: '1.25rem' }}>Catálogo em tempo real</div>
              {[
                ['🔩', loading ? '...' : `${stats.total} peças`, 'cadastradas no sistema'],
                ['📂', loading ? '...' : `${stats.categorias} categorias`, 'disponíveis para filtro'],
                ['🚚', 'Frete calculado', 'pelo Melhor Envio'],
              ].map(([icon, title, desc]) => (
                <div key={title} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.85rem 0', borderTop: '1px solid rgba(255,255,255,0.16)' }}>
                  <span style={{ width: 34, height: 34, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', backgroundColor: HIGHLIGHT, color: BORDEAUX, fontWeight: 900, fontSize: '1rem' }}>{icon}</span>
                  <div>
                    <strong style={{ display: 'block', color: CREAM }}>{title}</strong>
                    <small style={{ color: 'rgba(245,237,216,0.75)' }}>{desc}</small>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* FEATURES RÁPIDAS */}
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px,1fr))', gap: '1.5rem', padding: '2rem 2.5rem 0' }}>
            {[
              ['🔍', 'Busca avançada', 'Filtre por nome, código, preço e condição'],
              ['📦', 'Estoque em tempo real', 'Disponibilidade atualizada a cada consulta'],
              ['🏎️', 'Frete Melhor Envio', 'Cotação real de Correios e Jadlog no carrinho'],
            ].map(([icon, title, desc]) => (
              <div key={title} style={{ backgroundColor: '#fff', border: `1px solid ${BORDER}`, borderRadius: '1rem', padding: '1.25rem', boxShadow: '0 2px 8px rgba(123,29,46,0.06)' }}>
                <div style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>{icon}</div>
                <strong style={{ display: 'block', color: BORDEAUX, marginBottom: '0.3rem' }}>{title}</strong>
                <span style={{ color: DARK, fontSize: '0.88rem', lineHeight: 1.5 }}>{desc}</span>
              </div>
            ))}
          </section>

          {/* PEÇAS EM DESTAQUE */}
          <section style={{ padding: '2rem 2.5rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ margin: 0, color: BORDEAUX, fontFamily: "'Georgia', serif", fontSize: '1.3rem', fontWeight: 700 }}>Peças em Destaque</h2>
                <p style={{ margin: '4px 0 0', color: MUTED, fontSize: '0.83rem' }}>As peças mais recentes do catálogo</p>
              </div>
              <button onClick={() => navigate('/buscaPecas')} style={{ fontSize: '0.82rem', padding: '0.5rem 1rem', borderRadius: '9999px', color: BORDEAUX, border: `1.5px solid ${BORDEAUX}`, backgroundColor: 'transparent', fontWeight: 600, cursor: 'pointer' }}>
                Ver todos →
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px,1fr))', gap: '1.25rem' }}>
              {loading
                ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                : pecasDestaque.length > 0
                  ? pecasDestaque.map(peca => (
                      <PecaCard
                        key={peca.id}
                        peca={peca}
                        onVerDetalhe={() => navigate(`/pecas/${peca.id}`)}
                        onAddToCart={() => handleAddToCart(peca)}
                        jaNoCarrinho={jaNoCarrinho(peca.id)}
                        addedFeedback={addedId === peca.id}
                      />
                    ))
                  : <EmptyPecas navigate={navigate} />
              }
            </div>
          </section>

          {/* CATEGORIAS */}
          <section style={{ padding: '2rem 2.5rem 0' }}>
            <h2 style={{ margin: '0 0 1.25rem', color: BORDEAUX, fontFamily: "'Georgia', serif", fontSize: '1.3rem', fontWeight: 700 }}>Explorar por categoria</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: '1rem' }}>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="skeleton" style={{ height: 100, borderRadius: 12 }} />
                  ))
                : categorias.map(cat => (
                    <div
                      key={cat.id}
                      className="cat-card"
                      onClick={() => navigate(`/buscaPecas?categoria_id=${cat.id}`)}
                      style={{ backgroundColor: '#fff', border: `2px solid ${BORDER}`, borderRadius: 12, padding: '1.25rem 1rem', textAlign: 'center' }}
                    >
                      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                        {CATEGORIA_ICONS[cat.nome] || '🔧'}
                      </div>
                      <p style={{ margin: 0, fontWeight: 700, color: DARK, fontSize: '0.95rem' }}>{cat.nome}</p>
                    </div>
                  ))
              }
            </div>
          </section>

          {/* PEÇAS RECENTES */}
          {(loading || pecasRecentes.length > 0) && (
            <section style={{ padding: '2rem 2.5rem 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div>
                  <h2 style={{ margin: 0, color: BORDEAUX, fontFamily: "'Georgia', serif", fontSize: '1.3rem', fontWeight: 700 }}>Adicionadas Recentemente</h2>
                  <p style={{ margin: '4px 0 0', color: MUTED, fontSize: '0.83rem' }}>Últimas peças cadastradas no sistema</p>
                </div>
                <button onClick={() => navigate('/buscaPecas?sort=data_cadastro&order=desc')} style={{ fontSize: '0.82rem', padding: '0.5rem 1rem', borderRadius: '9999px', color: BORDEAUX, border: `1.5px solid ${BORDEAUX}`, backgroundColor: 'transparent', fontWeight: 600, cursor: 'pointer' }}>
                  Ver todas →
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px,1fr))', gap: '1.25rem' }}>
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                  : pecasRecentes.map(peca => (
                      <PecaCard
                        key={peca.id}
                        peca={peca}
                        onVerDetalhe={() => navigate(`/pecas/${peca.id}`)}
                        onAddToCart={() => handleAddToCart(peca)}
                        jaNoCarrinho={jaNoCarrinho(peca.id)}
                        addedFeedback={addedId === peca.id}
                      />
                    ))
                }
              </div>
            </section>
          )}

          {/* FILTROS RÁPIDOS */}
          <section style={{ padding: '2rem 2.5rem' }}>
            <h2 style={{ margin: '0 0 1rem', color: BORDEAUX, fontFamily: "'Georgia', serif", fontSize: '1.3rem', fontWeight: 700 }}>Filtros rápidos</h2>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {[
                { label: '🔥 Mais baratos', url: '/buscaPecas?sort=preco&order=asc' },
                { label: '💰 Mais caros', url: '/buscaPecas?sort=preco&order=desc' },
                { label: '🚀 Mais recentes', url: '/buscaPecas?sort=data_cadastro&order=desc' },
                { label: '✨ Condição NOS', url: '/buscaPecas?condicao=NOS' },
                { label: '🛠️ Restauradas', url: '/buscaPecas?condicao=Restaurada' },
                { label: '💵 Até R$ 500', url: '/buscaPecas?max_preco=500' },
                { label: '💎 Acima R$ 5.000', url: '/buscaPecas?min_preco=5000' },
              ].map(({ label, url }) => (
                <button
                  key={label}
                  onClick={() => navigate(url)}
                  style={{ padding: '0.6rem 1.1rem', borderRadius: '9999px', border: `1.5px solid ${BORDER}`, backgroundColor: '#fff', color: DARK, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.18s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = BORDEAUX; e.currentTarget.style.color = BORDEAUX; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.color = DARK; }}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          {/* CTA FINAL */}
          <section style={{ margin: '0 2.5rem 3rem', backgroundColor: BORDEAUX, borderRadius: 16, padding: '2.5rem', textAlign: 'center', backgroundImage: 'radial-gradient(circle at 80% 50%, rgba(240,192,96,0.18), transparent 60%)' }}>
            <h2 style={{ color: HIGHLIGHT, fontFamily: "'Georgia', serif", fontSize: '1.6rem', margin: '0 0 0.75rem' }}>Tem peças para vender?</h2>
            <p style={{ color: 'rgba(245,237,216,0.85)', marginBottom: '1.5rem' }}>Cadastre suas peças automotivas e alcance compradores de todo o Brasil.</p>
            <button onClick={() => navigate('/cadastroPecas')} style={{ padding: '0.9rem 2rem', borderRadius: '9999px', backgroundColor: HIGHLIGHT, color: BORDEAUX, fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: '1rem' }}>
              Cadastrar peça agora
            </button>
          </section>

        </main>
      </div>
    </div>
  );
}

function PecaCard({ peca, onVerDetalhe, onAddToCart, jaNoCarrinho, addedFeedback }) {
  const semEstoque = Number(peca.estoque_atual) === 0;

  return (
    <article
      className="peca-card"
      style={{ backgroundColor: '#fff', borderRadius: 14, border: `1px solid ${BORDER}`, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 2px 8px rgba(123,29,46,0.05)' }}
    >
      {/* Imagem */}
      <div
        onClick={onVerDetalhe}
        style={{ height: 180, backgroundColor: '#F2EAD3', position: 'relative', overflow: 'hidden', cursor: 'pointer' }}
      >
        {peca.imagem ? (
          <img src={peca.imagem} alt={peca.nome_peca} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: MUTED }}>
            <span style={{ fontSize: '2.5rem' }}>🔧</span>
            <span style={{ fontSize: '0.75rem', marginTop: 6 }}>Sem imagem</span>
          </div>
        )}
        {peca.condicao && (
          <span style={{ position: 'absolute', top: 10, left: 10, backgroundColor: BORDEAUX, color: HIGHLIGHT, fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px', borderRadius: 999 }}>
            {peca.condicao}
          </span>
        )}
        {semEstoque && (
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem', backgroundColor: 'rgba(0,0,0,0.5)', padding: '4px 12px', borderRadius: 999 }}>Sem estoque</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', flex: 1, gap: 6 }}>
        <h3
          onClick={onVerDetalhe}
          style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: DARK, cursor: 'pointer', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
        >
          {peca.nome_peca}
        </h3>
        {peca.sku && <p style={{ margin: 0, fontSize: '0.75rem', color: MUTED }}>SKU: {peca.sku}</p>}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 10, borderTop: `1px solid ${BORDER}` }}>
          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: BORDEAUX }}>{formatBRL(peca.preco)}</span>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: semEstoque ? '#991B1B' : '#065F46', backgroundColor: semEstoque ? '#FEE2E2' : '#D1FAE5', padding: '3px 8px', borderRadius: 999 }}>
            {semEstoque ? 'Indisponível' : `${peca.estoque_atual} un.`}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <button
            onClick={onVerDetalhe}
            style={{ flex: 1, padding: '8px', backgroundColor: 'transparent', border: `1.5px solid ${BORDEAUX}`, borderRadius: 8, color: BORDEAUX, fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem', transition: 'all 0.18s' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = `${BORDEAUX}10`; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            Ver detalhe
          </button>
          <button
            onClick={onAddToCart}
            disabled={semEstoque || addedFeedback}
            style={{ flex: 1, padding: '8px', backgroundColor: addedFeedback ? '#065F46' : semEstoque ? '#ccc' : BORDEAUX, border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, cursor: semEstoque ? 'not-allowed' : 'pointer', fontSize: '0.82rem', transition: 'all 0.18s' }}
          >
            {addedFeedback ? '✓ Adicionado' : '+ Carrinho'}
          </button>
        </div>
      </div>
    </article>
  );
}

function SkeletonCard() {
  return (
    <div style={{ backgroundColor: '#fff', borderRadius: 14, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
      <div className="skeleton" style={{ height: 180 }} />
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="skeleton" style={{ height: 16, width: '80%' }} />
        <div className="skeleton" style={{ height: 14, width: '50%' }} />
        <div className="skeleton" style={{ height: 14, width: '40%' }} />
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <div className="skeleton" style={{ flex: 1, height: 34 }} />
          <div className="skeleton" style={{ flex: 1, height: 34 }} />
        </div>
      </div>
    </div>
  );
}

function EmptyPecas({ navigate }) {
  return (
    <div style={{ gridColumn: '1/-1', backgroundColor: '#fff', borderRadius: 14, padding: '3rem', textAlign: 'center', border: `1px solid ${BORDER}` }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔧</div>
      <h3 style={{ color: BORDEAUX, margin: '0 0 0.5rem' }}>Nenhuma peça cadastrada ainda</h3>
      <p style={{ color: MUTED, marginBottom: '1.5rem' }}>Seja o primeiro a cadastrar uma peça no catálogo.</p>
      <button onClick={() => navigate('/cadastroPecas')} style={{ backgroundColor: BORDEAUX, color: CREAM, padding: '10px 24px', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
        Cadastrar peça
      </button>
    </div>
  );
}
