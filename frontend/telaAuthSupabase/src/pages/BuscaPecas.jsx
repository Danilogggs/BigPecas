import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import { listarCategorias, listarPecas } from '../services/pecasService';

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

const MAX_PRICE_FILTER = 50000;

export default function BuscaPecas() {
  const [searchParams] = useSearchParams();
  const nomeUrl = searchParams.get('nome') || '';
  const categoriaUrl = searchParams.get('categoria_id') || '';

  const [showFilters, setShowFilters] = useState(false);
  const [pecas, setPecas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingCategorias, setLoadingCategorias] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

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

  const fetchPecas = async () => {
    const params = {
      ...filters,
      sort,
      ordem,
    };

    setLoading(true);
    setErrorMessage('');

    try {
      const data = await listarPecas(params);
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
    return categoria?.nome || 'Categoria não informada';
  }

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

        .peca-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .peca-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 18px 30px rgba(0, 0, 0, 0.14);
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
          <span style={{ fontWeight: 'bold', color: COLORS.BORDEAUX, marginRight: SPACING.SM }}>
            Ordenar por:
          </span>

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
                <input
                  name="nome"
                  value={filters.nome}
                  onChange={handleChange}
                  style={INPUT_STYLE}
                />
              </div>

              <div>
                <label style={LABEL_STYLE}>Categoria</label>
                <select
                  name="categoria_id"
                  value={filters.categoria_id}
                  onChange={handleChange}
                  disabled={loadingCategorias}
                  style={INPUT_STYLE}
                >
                  <option value="">{loadingCategorias ? 'Carregando...' : 'Todas'}</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={LABEL_STYLE}>Condição</label>
                <select
                  name="condicao"
                  value={filters.condicao}
                  onChange={handleChange}
                  style={INPUT_STYLE}
                >
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
                    left: `${(filters.min_preco / MAX_PRICE_FILTER) * 100}%`,
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
                    left: `${(filters.max_preco / MAX_PRICE_FILTER) * 100}%`,
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
                    top: '18px',
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: '#ddd',
                    borderRadius: '4px',
                  }} />

                  <div style={{
                    position: 'absolute',
                    top: '18px',
                    left: `${(filters.min_preco / MAX_PRICE_FILTER) * 100}%`,
                    right: `${100 - (filters.max_preco / MAX_PRICE_FILTER) * 100}%`,
                    height: '4px',
                    background: COLORS.BORDEAUX,
                    borderRadius: '4px',
                  }} />

                  <input
                    type="range"
                    className="dual-range"
                    min="0"
                    max={MAX_PRICE_FILTER}
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
                      position: 'absolute',
                      width: '100%',
                      height: '40px',
                      appearance: 'none',
                      background: 'none',
                      zIndex: 3,
                    }}
                  />

                  <input
                    type="range"
                    className="dual-range"
                    min="0"
                    max={MAX_PRICE_FILTER}
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
                      position: 'absolute',
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
            <article
              key={item.id}
              className="peca-card"
              style={{
                backgroundColor: '#fff',
                borderRadius: BORDER_RADIUS.LG,
                boxShadow: SHADOWS.SM,
                overflow: 'hidden',
                border: '1px solid rgba(123, 29, 46, 0.12)',
                display: 'flex',
                flexDirection: 'column',
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
                }}
              >
                {item.imagem ? (
                  <img
                    src={item.imagem}
                    alt={item.nome_peca || 'Imagem da peça'}
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
                      color: COLORS.BORDEAUX,
                      fontWeight: 700,
                      textAlign: 'center',
                      padding: SPACING.MD,
                    }}
                  >
                    <span style={{ fontSize: '2rem', marginBottom: SPACING.SM }}>🔧</span>
                    <span>Sem imagem</span>
                  </div>
                )}
              </div>

              <div style={{ padding: SPACING.LG, display: 'flex', flexDirection: 'column', gap: SPACING.SM }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: SPACING.MD }}>
                  <h2
                    style={{
                      margin: 0,
                      color: COLORS.BORDEAUX,
                      fontSize: '1.15rem',
                      lineHeight: 1.3,
                    }}
                  >
                    {item.nome_peca || 'Peça sem nome'}
                  </h2>

                  <span
                    style={{
                      backgroundColor: '#F8E9C5',
                      color: COLORS.BORDEAUX,
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
                    color: '#7A5C4B',
                    fontSize: '0.9rem',
                  }}
                >
                  Categoria: {buscarNomeCategoria(item.categoria_id)}
                </p>

                {item.sku && (
                  <p
                    style={{
                      margin: 0,
                      color: '#7A5C4B',
                      fontSize: '0.9rem',
                    }}
                  >
                    SKU: {item.sku}
                  </p>
                )}

                {item.oem_number && (
                  <p
                    style={{
                      margin: 0,
                      color: '#7A5C4B',
                      fontSize: '0.9rem',
                    }}
                  >
                    OEM: {item.oem_number}
                  </p>
                )}

                <div
                  style={{
                    marginTop: SPACING.SM,
                    paddingTop: SPACING.SM,
                    borderTop: '1px solid #F0E1C8',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: SPACING.MD,
                  }}
                >
                  <strong
                    style={{
                      color: COLORS.BORDEAUX,
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
                    Estoque: {item.estoque_atual ?? 0}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}