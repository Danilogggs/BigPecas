/**
 * CadastroPecas.jsx
 * Register parts page following the design pattern
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SearchIcon, UserIcon, ChevronDownIcon, WrenchIcon, BoltIcon, StarIcon } from '../components/Icons';
import { cadastrarPeca } from '../services/pecasService';
import { menuItems } from '../data/mockData';

const BORDEAUX = '#7B1D2E';
const CREAM = '#F5EDD8';
const HIGHLIGHT = '#F0C060';

const SPACING = {
  XS: '0.25rem',
  SM: '0.5rem',
  MD: '1rem',
  LG: '1.5rem',
  XL: '2rem',
  XXL: '2.5rem',
};

export default function CadastroPecas() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('Catálogo');
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [formData, setFormData] = useState({
    nome_peca: '',
    sku: '',
    oem_number: '',
    num_serie: '',
    categoria: '',
    material: '',
    condicao: 'NOS',
    peso_gramas: '',
    comprimento_mm: '',
    largura_mm: '',
    altura_mm: '',
    detalhes_gravacao: '',
    historico_proveniencia: '',
    preco: '',
    estoque_atual: ''
  });

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const iconMap = {
    wrench: <WrenchIcon size={16} />,
    bolt: <BoltIcon size={16} />,
    star: <StarIcon size={16} />,
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await cadastrarPeca(formData);
      setMessage({ type: 'success', text: response.message || 'Peça cadastrada com sucesso!' });
      setFormData({
        nome_peca: '',
        sku: '',
        oem_number: '',
        num_serie: '',
        categoria: '',
        material: '',
        condicao: 'NOS',
        peso_gramas: '',
        comprimento_mm: '',
        largura_mm: '',
        altura_mm: '',
        detalhes_gravacao: '',
        historico_proveniencia: '',
        preco: '',
        estoque_atual: ''
      });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Não foi possível cadastrar a peça. Revise os dados e tente novamente.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* ── HEADER ── */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: `0 ${SPACING.LG}`,
          backgroundColor: BORDEAUX,
          minHeight: 64,
          flexShrink: 0,
          gap: SPACING.LG,
        }}
      >
        <div style={{ width: '20%', display: 'flex', alignItems: 'center', gap: SPACING.SM }}>
          <span
            style={{
              color: CREAM,
              fontFamily: "'Georgia', serif",
              fontSize: '1.55rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textShadow: '1px 1px 4px rgba(0,0,0,0.35)',
              whiteSpace: 'nowrap',
            }}
          >
            🔧 Big<span style={{ color: HIGHLIGHT }}>Peças</span>
          </span>
        </div>

        <div style={{ width: '25%' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              borderRadius: '9999px',
              backgroundColor: 'rgba(255,255,255,0.13)',
              border: '1.5px solid rgba(255,255,255,0.3)',
              overflow: 'hidden',
            }}
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar peças, modelos..."
              style={{
                flex: 1,
                backgroundColor: 'transparent',
                outline: 'none',
                border: 'none',
                padding: `${SPACING.SM} ${SPACING.MD}`,
                fontSize: '0.875rem',
                color: '#fff',
              }}
            />
            <button
              style={{
                padding: `${SPACING.SM} ${SPACING.MD}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'transparent',
                border: 'none',
                color: HIGHLIGHT,
                cursor: 'pointer',
                opacity: 1,
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => (e.target.style.opacity = '0.8')}
              onMouseLeave={(e) => (e.target.style.opacity = '1')}
            >
              <SearchIcon size={17} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: `${SPACING.SM} ${SPACING.MD}`,
              borderRadius: '9999px',
              backgroundColor: dropdownOpen ? 'rgba(255,255,255,0.15)' : 'transparent',
              border: 'none',
              color: CREAM,
              cursor: 'pointer',
              transition: 'all 0.25s',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = dropdownOpen
                ? 'rgba(255,255,255,0.15)'
                : 'transparent')
            }
          >
            <ChevronDownIcon
              size={17}
              color={HIGHLIGHT}
              style={{
                transition: 'transform 0.25s',
                transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
            />
            <UserIcon size={26} />
          </button>

          {dropdownOpen && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '100%',
                marginTop: SPACING.SM,
                minWidth: 190,
                backgroundColor: '#fff',
                border: `1.5px solid ${BORDEAUX}22`,
                borderRadius: '0.75rem',
                overflow: 'hidden',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                zIndex: 50,
              }}
            >
              {user ? (
                <>
                  <button
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: SPACING.MD,
                      padding: `${SPACING.MD} ${SPACING.LG}`,
                      fontSize: '0.875rem',
                      color: BORDEAUX,
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: 'transparent',
                      textAlign: 'left',
                      fontWeight: 500,
                      borderBottom: '1px solid #F3E8D8',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FFF5E8')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    onClick={() => {
                      navigate('/dashboard');
                      setDropdownOpen(false);
                    }}
                  >
                    Dashboard
                  </button>
                  <button
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: SPACING.MD,
                      padding: `${SPACING.MD} ${SPACING.LG}`,
                      fontSize: '0.875rem',
                      color: '#B91C1C',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: 'transparent',
                      textAlign: 'left',
                      fontWeight: 500,
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FFF5E8')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    onClick={() => {
                      logout();
                      navigate('/login');
                      setDropdownOpen(false);
                    }}
                  >
                    Sair
                  </button>
                </>
              ) : (
                <button
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: SPACING.MD,
                    padding: `${SPACING.MD} ${SPACING.LG}`,
                    fontSize: '0.875rem',
                    color: BORDEAUX,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: 'transparent',
                    textAlign: 'left',
                    fontWeight: 500,
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FFF5E8')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  onClick={() => {
                    navigate('/login');
                    setDropdownOpen(false);
                  }}
                >
                  Login
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ── BODY ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left sidebar */}
        <aside
          style={{
            width: '20%',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            paddingTop: SPACING.LG,
            paddingBottom: SPACING.XXL,
            backgroundColor: BORDEAUX,
            overflowY: 'auto',
          }}
        >
          <p
            style={{
              paddingLeft: SPACING.LG,
              paddingRight: SPACING.LG,
              paddingBottom: SPACING.SM,
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.45)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            Menu
          </p>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', paddingLeft: SPACING.MD, paddingRight: SPACING.MD }}>
            {menuItems.map((item) => {
              const isActive = activeNav === item.label;
              return (
                <button
                  key={item.label}
                  onClick={() => setActiveNav(item.label)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: SPACING.MD,
                    padding: `${SPACING.MD} ${SPACING.MD}`,
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    backgroundColor: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                    color: isActive ? HIGHLIGHT : CREAM,
                    fontWeight: isActive ? 600 : 400,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    borderLeft: isActive ? `3px solid ${HIGHLIGHT}` : '3px solid transparent',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: SPACING.MD }}>
                    {iconMap[item.icon] || iconMap.wrench}
                    {item.label}
                  </span>
                  <span style={{ opacity: isActive ? 1 : 0.4 }}>›</span>
                </button>
              );
            })}
          </nav>

          <div
            style={{
              marginLeft: SPACING.LG,
              marginRight: SPACING.LG,
              marginTop: SPACING.LG,
              marginBottom: SPACING.LG,
              borderTop: '1px solid rgba(255,255,255,0.12)',
            }}
          />

          <div
            style={{
              marginLeft: SPACING.MD,
              marginRight: SPACING.MD,
              borderRadius: '0.75rem',
              padding: SPACING.MD,
              backgroundColor: 'rgba(0,0,0,0.2)',
            }}
          >
            <p
              style={{
                fontSize: '0.75rem',
                marginBottom: '0.25rem',
                color: HIGHLIGHT,
                fontWeight: 700,
              }}
            >
              Cadastro Rápido
            </p>
            <p
              style={{
                fontSize: '0.75rem',
                lineHeight: 1.5,
                color: 'rgba(255,255,255,0.65)',
              }}
            >
              Adicione novos itens ao catálogo de peças vintage.
            </p>
            <button
              style={{
                marginTop: SPACING.MD,
                width: '100%',
                padding: `0.375rem 0`,
                borderRadius: '0.5rem',
                fontSize: '0.75rem',
                backgroundColor: HIGHLIGHT,
                color: BORDEAUX,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              onClick={() => navigate('/')}
            >
              Home
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            backgroundColor: CREAM,
            padding: SPACING.XXL,
          }}
        >
          <h1 style={{ color: BORDEAUX, fontFamily: "'Georgia', serif", fontSize: '1.8rem', fontWeight: 700, marginBottom: SPACING.SM }}>
            Cadastrar Peça
          </h1>
          <p style={{ color: '#9B7B6A', marginBottom: SPACING.XXL }}>
            Adicione novos itens ao catálogo de peças vintage
          </p>

          {message.text && (
            <div
              style={{
                padding: SPACING.MD,
                marginBottom: SPACING.LG,
                borderRadius: '0.625rem',
                backgroundColor: message.type === 'success' ? '#D1FAE5' : '#FEE2E2',
                color: message.type === 'success' ? '#065F46' : '#7F1D1D',
                border: `2px solid ${message.type === 'success' ? '#6EE7B7' : '#FCA5A5'}`,
                fontSize: '0.95rem'
              }}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ maxWidth: '800px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACING.LG, marginBottom: SPACING.XL }}>
              <div>
                <label style={{ display: 'block', marginBottom: SPACING.SM, fontWeight: 600, color: BORDEAUX }}>Nome da Peça *</label>
                <input type="text" name="nome_peca" value={formData.nome_peca} onChange={handleInputChange} required style={{
                  width: '100%', padding: SPACING.MD, border: `1px solid #ddd`, borderRadius: '0.5rem', boxSizing: 'border-box'
                }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: SPACING.SM, fontWeight: 600, color: BORDEAUX }}>SKU *</label>
                <input type="text" name="sku" value={formData.sku} onChange={handleInputChange} required style={{
                  width: '100%', padding: SPACING.MD, border: `1px solid #ddd`, borderRadius: '0.5rem', boxSizing: 'border-box'
                }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: SPACING.SM, fontWeight: 600, color: BORDEAUX }}>Número OEM</label>
                <input type="text" name="oem_number" value={formData.oem_number} onChange={handleInputChange} style={{
                  width: '100%', padding: SPACING.MD, border: `1px solid #ddd`, borderRadius: '0.5rem', boxSizing: 'border-box'
                }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: SPACING.SM, fontWeight: 600, color: BORDEAUX }}>Número de Série</label>
                <input type="text" name="num_serie" value={formData.num_serie} onChange={handleInputChange} style={{
                  width: '100%', padding: SPACING.MD, border: `1px solid #ddd`, borderRadius: '0.5rem', boxSizing: 'border-box'
                }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: SPACING.SM, fontWeight: 600, color: BORDEAUX }}>Categoria</label>
                <input type="text" name="categoria" value={formData.categoria} onChange={handleInputChange} style={{
                  width: '100%', padding: SPACING.MD, border: `1px solid #ddd`, borderRadius: '0.5rem', boxSizing: 'border-box'
                }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: SPACING.SM, fontWeight: 600, color: BORDEAUX }}>Material</label>
                <input type="text" name="material" value={formData.material} onChange={handleInputChange} style={{
                  width: '100%', padding: SPACING.MD, border: `1px solid #ddd`, borderRadius: '0.5rem', boxSizing: 'border-box'
                }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: SPACING.SM, fontWeight: 600, color: BORDEAUX }}>Condição *</label>
                <select name="condicao" value={formData.condicao} onChange={handleInputChange} style={{
                  width: '100%', padding: SPACING.MD, border: `1px solid #ddd`, borderRadius: '0.5rem', boxSizing: 'border-box'
                }}>
                  <option>NOS</option>
                  <option>EXCELENTE</option>
                  <option>BOM</option>
                  <option>ACEITÁVEL</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: SPACING.SM, fontWeight: 600, color: BORDEAUX }}>Preço *</label>
                <input type="number" name="preco" value={formData.preco} onChange={handleInputChange} required step="0.01" style={{
                  width: '100%', padding: SPACING.MD, border: `1px solid #ddd`, borderRadius: '0.5rem', boxSizing: 'border-box'
                }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: SPACING.SM, fontWeight: 600, color: BORDEAUX }}>Estoque Atual *</label>
                <input type="number" name="estoque_atual" value={formData.estoque_atual} onChange={handleInputChange} required style={{
                  width: '100%', padding: SPACING.MD, border: `1px solid #ddd`, borderRadius: '0.5rem', boxSizing: 'border-box'
                }} />
              </div>
            </div>

            <div style={{ marginBottom: SPACING.XL }}>
              <label style={{ display: 'block', marginBottom: SPACING.SM, fontWeight: 600, color: BORDEAUX }}>Dimensões (mm)</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: SPACING.MD }}>
                <input type="number" name="comprimento_mm" placeholder="Comprimento" value={formData.comprimento_mm} onChange={handleInputChange} style={{
                  padding: SPACING.MD, border: `1px solid #ddd`, borderRadius: '0.5rem', boxSizing: 'border-box'
                }} />
                <input type="number" name="largura_mm" placeholder="Largura" value={formData.largura_mm} onChange={handleInputChange} style={{
                  padding: SPACING.MD, border: `1px solid #ddd`, borderRadius: '0.5rem', boxSizing: 'border-box'
                }} />
                <input type="number" name="altura_mm" placeholder="Altura" value={formData.altura_mm} onChange={handleInputChange} style={{
                  padding: SPACING.MD, border: `1px solid #ddd`, borderRadius: '0.5rem', boxSizing: 'border-box'
                }} />
              </div>
            </div>

            <div style={{ marginBottom: SPACING.XL }}>
              <label style={{ display: 'block', marginBottom: SPACING.SM, fontWeight: 600, color: BORDEAUX }}>Peso (gramas)</label>
              <input type="number" name="peso_gramas" value={formData.peso_gramas} onChange={handleInputChange} style={{
                width: '100%', padding: SPACING.MD, border: `1px solid #ddd`, borderRadius: '0.5rem', boxSizing: 'border-box'
              }} />
            </div>

            <div style={{ marginBottom: SPACING.XL }}>
              <label style={{ display: 'block', marginBottom: SPACING.SM, fontWeight: 600, color: BORDEAUX }}>Detalhes de Gravação</label>
              <textarea name="detalhes_gravacao" value={formData.detalhes_gravacao} onChange={handleInputChange} style={{
                width: '100%', padding: SPACING.MD, border: `1px solid #ddd`, borderRadius: '0.5rem', boxSizing: 'border-box', minHeight: '100px'
              }} />
            </div>

            <div style={{ marginBottom: SPACING.XXL }}>
              <label style={{ display: 'block', marginBottom: SPACING.SM, fontWeight: 600, color: BORDEAUX }}>Histórico de Procedência</label>
              <textarea name="historico_proveniencia" value={formData.historico_proveniencia} onChange={handleInputChange} style={{
                width: '100%', padding: SPACING.MD, border: `1px solid #ddd`, borderRadius: '0.5rem', boxSizing: 'border-box', minHeight: '100px'
              }} />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: `${SPACING.MD} ${SPACING.XXL}`,
                borderRadius: '0.5rem',
                fontSize: '1rem',
                backgroundColor: BORDEAUX,
                color: CREAM,
                fontWeight: 700,
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.opacity = '0.9';
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.opacity = '1';
              }}
            >
              {loading ? 'Cadastrando...' : '✓ Cadastrar Peça'}
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}
