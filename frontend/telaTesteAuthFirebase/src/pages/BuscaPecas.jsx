import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import ProductCard from '../components/ProductCard';

import {
  COLORS,
  SPACING,
  INPUT_STYLE,
  LABEL_STYLE,
  BUTTON_PRIMARY_STYLE,
  BORDER_RADIUS,
  SHADOWS,
} from '../styles/theme';
import { parseErrorResponse, parseUnexpectedError } from '../utils/friendlyErrors';

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
    const params = {
      ...filters,
      sort,
      ordem,
    };

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
      console.error('Erro ao buscar peças:', error);
      setPecas([]);
      setErrorMessage(parseUnexpectedError(error, 'Não foi possível carregar as peças no momento.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPecas();
  }, [sort, ordem]);

  useEffect(() => {
    const delay = setTimeout(() => {
      fetchPecas();
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

  const shouldShowEmptyState = !loading && !errorMessage && pecas.length === 0;

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
      `}</style>

      <Header />

      <main>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: SPACING.SM,
          padding: `${SPACING.XL} ${SPACING.XL} 0`,
        }}>
          <span style={{ fontWeight: 'bold', color: COLORS.BORDEAUX, marginRight: SPACING.SM }}>Ordenar por:</span>

          <button
            onClick={() => handleSortClick('preco')}
            style={{
              ...BUTTON_PRIMARY_STYLE,
              backgroundColor: sort === 'preco' ? COLORS.BORDEAUX : '#ccc',
              padding: '8px 16px',
            }}
          >
            Preço {sort === 'preco' ? (ordem === 'asc' ? '↑' : '↓') : ''}
          </button>

          <button
            onClick={() => handleSortClick('data_cadastro')}
            style={{
              ...BUTTON_PRIMARY_STYLE,
              backgroundColor: sort === 'data_cadastro' ? COLORS.BORDEAUX : '#ccc',
              padding: '8px 16px',
            }}
          >
            Data de Cadastro {sort === 'data_cadastro' ? (ordem === 'asc' ? '↑' : '↓') : ''}
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
            {showFilters ? 'Esconder Filtros' : 'Mostrar Filtros'}
          </button>
        </div>

        {showFilters && (
          <div style={{
            margin: `0 ${SPACING.XL}`,
            backgroundColor: '#fff',
            padding: SPACING.XL,
            borderRadius: BORDER_RADIUS.LG,
            boxShadow: SHADOWS.SM,
          }}>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: SPACING.LG,
            }}>

              <div>
                <label style={LABEL_STYLE}>Nome</label>
                <input name="nome" value={filters.nome} onChange={handleChange} style={INPUT_STYLE} />
              </div>

              <div>
                <label style={LABEL_STYLE}>Categoria</label>
                <select name="categoria_id" value={filters.categoria_id} onChange={handleChange} style={INPUT_STYLE}>
                  <option value="">Todas</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={LABEL_STYLE}>Condição</label>
                <select name="condicao" value={filters.condicao} onChange={handleChange} style={INPUT_STYLE}>
                  <option value="">Todas</option>
                  <option value="NOS">NOS</option>
                  <option value="EXCELENTE">Excelente</option>
                  <option value="BOM">Bom</option>
                  <option value="ACEITÁVEL">Aceitável</option>
                </select>
              </div>

              <div style={{ gridColumn: 'span 2', marginTop: SPACING.SM }}>
                <label style={LABEL_STYLE}>Faixa de Preço</label>

                <div style={{ position: 'relative', height: '40px', marginTop: '25px' }}>

                  <div style={{
                    position: 'absolute',
                    top: '-22px',
                    left: `${(filters.min_preco / 1000) * 100}%`,
                    transform: 'translateX(-50%)',
                    backgroundColor: COLORS.BORDEAUX,
                    color: '#fff',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    pointerEvents: 'none',
                    zIndex: 10,
                    whiteSpace: 'nowrap',
                  }}>
                    R$ {filters.min_preco}
                  </div>

                  <div style={{
                    position: 'absolute',
                    top: '-22px',
                    left: `${(filters.max_preco / 1000) * 100}%`,
                    transform: 'translateX(-50%)',
                    backgroundColor: COLORS.BORDEAUX,
                    color: '#fff',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    pointerEvents: 'none',
                    zIndex: 10,
                    whiteSpace: 'nowrap',
                  }}>
                    R$ {filters.max_preco}
                  </div>

                  <div style={{
                    position: 'absolute',
                    top: '18px', left: 0, right: 0, height: '4px',
                    background: '#ddd', borderRadius: '4px',
                  }} />

                  <div style={{
                    position: 'absolute',
                    top: '18px',
                    left: `${(filters.min_preco / 1000) * 100}%`,
                    right: `${100 - (filters.max_preco / 1000) * 100}%`,
                    height: '4px',
                    background: COLORS.BORDEAUX,
                    borderRadius: '4px',
                  }} />

                  <input
                    type="range"
                    className="dual-range"
                    min="0"
                    max="1000"
                    value={filters.min_preco}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      if (value > filters.max_preco) {
                        setFilters((prev) => ({ ...prev, min_preco: value, max_preco: value }));
                      } else {
                        setFilters((prev) => ({ ...prev, min_preco: value }));
                      }
                    }}
                    style={{
                      position: 'absolute', width: '100%', height: '40px',
                      appearance: 'none', background: 'none', zIndex: 3,
                    }}
                  />

                  <input
                    type="range"
                    className="dual-range"
                    min="0"
                    max="1000"
                    value={filters.max_preco}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      if (value < filters.min_preco) {
                        setFilters((prev) => ({ ...prev, max_preco: value, min_preco: value }));
                      } else {
                        setFilters((prev) => ({ ...prev, max_preco: value }));
                      }
                    }}
                    style={{
                      position: 'absolute', width: '100%', height: '40px',
                      appearance: 'none', background: 'none', zIndex: 4,
                    }}
                  />
                </div>
              </div>
            </div>
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
          <div style={{ padding: `0 ${SPACING.XL}`, color: COLORS.BORDEAUX, fontWeight: 600 }}>
            Carregando peças...
          </div>
        )}

        {shouldShowEmptyState && (
          <div style={{ padding: `0 ${SPACING.XL}`, color: '#9B7B6A' }}>
            Nenhuma peça foi encontrada com os filtros informados.
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: SPACING.LG,
          padding: SPACING.XL,
        }}>
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
      </main>
    </div>
  );
}
