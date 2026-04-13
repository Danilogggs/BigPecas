import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import PageLayout from '../components/layouts/PageLayout';
import { parseErrorResponse, parseUnexpectedError } from '../utils/friendlyErrors';
import styles from './BuscaPecas.module.css';

const API_BASE_URL = import.meta.env.VITE_PECAS_API_URL || 'http://localhost:3002/api';

const categorias = [
  { id: 1, nome: 'Motor' },
  { id: 2, nome: 'Lataria' },
  { id: 3, nome: 'Elétrica' },
  { id: 4, nome: 'Interior' },
  { id: 5, nome: 'Suspensão' },
  { id: 6, nome: 'Freios' },
];

export default function BuscaPecas() {
  const [searchParams] = useSearchParams();
  const nomeUrl = searchParams.get('nome') || '';

  const [showFilters, setShowFilters] = useState(false);
  const [pecas, setPecas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [filters, setFilters] = useState({
    nome: nomeUrl,
    categoria_id: '',
    condicao: '',
    min_preco: 0,
    max_preco: 1000,
  });

  const [sort, setSort] = useState('preco');
  const [ordem, setOrdem] = useState('asc');

  useEffect(() => {
    const novoNome = searchParams.get('nome') || '';
    setFilters((prev) => ({ ...prev, nome: novoNome }));
  }, [searchParams]);

  const fetchPecas = async () => {
    const params = { ...filters, sort, ordem };
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([_, v]) => v !== '' && v !== null))
    ).toString();

    setLoading(true);
    setErrorMessage('');

    try {
      const res = await fetch(`${API_BASE_URL}/pecas?${query}`);
      if (!res.ok) {
        throw new Error(await parseErrorResponse(res, 'Não foi possível carregar as peças no momento.'));
      }
      const data = await res.json();
      setPecas(Array.isArray(data) ? data : []);
    } catch (error) {
      setPecas([]);
      setErrorMessage(parseUnexpectedError(error, 'Não foi possível carregar as peças no momento.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPecas(); }, [sort, ordem]);
  useEffect(() => {
    const delay = setTimeout(() => { fetchPecas(); }, 400);
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

  const shouldShowEmptyState = !loading && !errorMessage && pecas.length === 0;

  return (
    <PageLayout>
      <main className={styles.main}>
        <div className={styles.container}>
          {/* Page header */}
          <p className={styles.pageEyebrow}>Catálogo</p>
          <h1 className={styles.pageTitle}>Busca de Peças</h1>

          {/* Controls */}
          <div className={styles.controls}>
            <span className={styles.sortLabel}>Ordenar por:</span>

            <button
              onClick={() => handleSortClick('preco')}
              className={`${styles.sortBtn} ${sort === 'preco' ? styles.active : ''}`}
            >
              Preço {sort === 'preco' ? (ordem === 'asc' ? '↑' : '↓') : ''}
            </button>

            <button
              onClick={() => handleSortClick('data_cadastro')}
              className={`${styles.sortBtn} ${sort === 'data_cadastro' ? styles.active : ''}`}
            >
              Data {sort === 'data_cadastro' ? (ordem === 'asc' ? '↑' : '↓') : ''}
            </button>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`${styles.filterToggle} ${showFilters ? styles.open : ''}`}
            >
              {showFilters ? 'Ocultar filtros' : 'Filtros'}
            </button>
          </div>

          {/* Filters panel */}
          {showFilters && (
            <div className={styles.filtersPanel}>
              <div className={styles.filtersGrid}>
                <div>
                  <label className={styles.filterLabel}>Nome</label>
                  <input
                    name="nome"
                    value={filters.nome}
                    onChange={handleChange}
                    className={styles.filterInput}
                    placeholder="Buscar por nome..."
                  />
                </div>

                <div>
                  <label className={styles.filterLabel}>Categoria</label>
                  <select name="categoria_id" value={filters.categoria_id} onChange={handleChange} className={styles.filterInput}>
                    <option value="">Todas</option>
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={styles.filterLabel}>Condição</label>
                  <select name="condicao" value={filters.condicao} onChange={handleChange} className={styles.filterInput}>
                    <option value="">Todas</option>
                    <option value="NOS">NOS</option>
                    <option value="EXCELENTE">Excelente</option>
                    <option value="BOM">Bom</option>
                    <option value="ACEITÁVEL">Aceitável</option>
                  </select>
                </div>

                {/* Dual range — left/right computed inline, tudo mais no módulo */}
                <div className={styles.rangeWrap}>
                  <label className={styles.filterLabel}>
                    Faixa de preço: R$ {filters.min_preco} – R$ {filters.max_preco}
                  </label>
                  <div className={styles.rangeTrack}>
                    <div className={styles.rangeTrackBg} />
                    {/* Active fill: posição calculada dinamicamente */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '18px',
                        left: `${(filters.min_preco / 1000) * 100}%`,
                        right: `${100 - (filters.max_preco / 1000) * 100}%`,
                        height: '4px',
                        background: 'var(--bordeaux)',
                        borderRadius: '4px',
                      }}
                    />
                    <input
                      type="range"
                      min="0" max="1000"
                      value={filters.min_preco}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        setFilters((prev) => ({ ...prev, min_preco: Math.min(value, prev.max_preco) }));
                      }}
                      className={`${styles.dualRange} ${styles.rangeMin}`}
                    />
                    <input
                      type="range"
                      min="0" max="1000"
                      value={filters.max_preco}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        setFilters((prev) => ({ ...prev, max_preco: Math.max(value, prev.min_preco) }));
                      }}
                      className={`${styles.dualRange} ${styles.rangeMax}`}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Feedback */}
          {errorMessage && <div className={styles.alertError}>{errorMessage}</div>}
          {loading && <p className={styles.loading}>Carregando peças...</p>}
          {shouldShowEmptyState && (
            <div className={styles.emptyState}>
              <p className={styles.emptyTitle}>Nenhuma peça encontrada</p>
              <p className={styles.emptyHint}>Tente ajustar os filtros de busca.</p>
            </div>
          )}

          {/* Product grid */}
          <div className={styles.productsGrid}>
            {pecas.map((item) => (
              <ProductCard
                key={item.id}
                product={{
                  id: item.id,
                  name: item.nome_peca,
                  price: 'R$ ' + item.preco,
                  stock: item.estoque_atual,
                  condition: item.condicao,
                  image: item.imagem,
                }}
              />
            ))}
          </div>
        </div>
      </main>
    </PageLayout>
  );
}
