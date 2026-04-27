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

const INITIAL_FORM = {
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
  estoque_atual: '',
};

const REGEX = {
  nome_peca: /^[A-Za-zÀ-ÿ0-9\s.,ºª°/()-]{3,150}$/,
  sku: /^[A-Z0-9-]{3,30}$/,
  codigoOpcional: /^[A-Z0-9-]{2,50}$/,
  textoSimples: /^[A-Za-zÀ-ÿ0-9\s.,ºª°/()-]{2,80}$/,
  numeroInteiro: /^\d+$/,
  preco: /^\d+([.,]\d{1,2})?$/,
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
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState(INITIAL_FORM);

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

  function normalizeCode(value) {
    return value.toUpperCase().replace(/\s/g, '');
  }

  function normalizePrice(value) {
    return value.replace(',', '.');
  }

  function handleInputChange(e) {
    const { name, value } = e.target;

    const newValue = ['sku', 'oem_number', 'num_serie'].includes(name)
      ? normalizeCode(value)
      : value;

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: '',
    }));

    setMessage({ type: '', text: '' });
  }

function validateForm() {
  const newErrors = {};

  if (!formData.nome_peca.trim()) {
    newErrors.nome_peca = 'Informe o nome da peça.';
  } else if (!REGEX.nome_peca.test(formData.nome_peca.trim())) {
    newErrors.nome_peca = 'Use pelo menos 3 caracteres. Evite símbolos especiais.';
  }

  if (!formData.sku.trim()) {
    newErrors.sku = 'Informe o SKU da peça.';
  } else if (!REGEX.sku.test(formData.sku.trim())) {
    newErrors.sku = 'SKU inválido. Use letras maiúsculas, números e hífen. Ex: OPALA-FRISO-001.';
  }

  if (!formData.oem_number.trim()) {
    newErrors.oem_number = 'Informe o número OEM.';
  } else if (!REGEX.codigoOpcional.test(formData.oem_number.trim())) {
    newErrors.oem_number = 'Número OEM inválido. Use letras, números e hífen.';
  }

  if (!formData.num_serie.trim()) {
    newErrors.num_serie = 'Informe o número de série.';
  } else if (!REGEX.codigoOpcional.test(formData.num_serie.trim())) {
    newErrors.num_serie = 'Número de série inválido. Use letras, números e hífen.';
  }

  if (!formData.categoria.trim()) {
    newErrors.categoria = 'Informe a categoria da peça.';
  } else if (!REGEX.textoSimples.test(formData.categoria.trim())) {
    newErrors.categoria = 'Categoria inválida. Use pelo menos 2 caracteres válidos.';
  }

  if (!formData.material.trim()) {
    newErrors.material = 'Informe o material da peça.';
  } else if (!REGEX.textoSimples.test(formData.material.trim())) {
    newErrors.material = 'Material inválido. Use pelo menos 2 caracteres válidos.';
  }

  if (!formData.preco.trim()) {
    newErrors.preco = 'Informe o preço da peça.';
  } else if (!REGEX.preco.test(formData.preco.trim())) {
    newErrors.preco = 'Preço inválido. Ex: 3490.00 ou 3490,00.';
  } else if (Number(normalizePrice(formData.preco)) <= 0) {
    newErrors.preco = 'O preço deve ser maior que zero.';
  }

  if (!formData.estoque_atual.trim()) {
    newErrors.estoque_atual = 'Informe o estoque atual.';
  } else if (!REGEX.numeroInteiro.test(formData.estoque_atual.trim())) {
    newErrors.estoque_atual = 'O estoque deve ser um número inteiro.';
  }

  if (!formData.comprimento_mm.trim()) {
    newErrors.comprimento_mm = 'Informe o comprimento.';
  } else if (!REGEX.numeroInteiro.test(formData.comprimento_mm.trim())) {
    newErrors.comprimento_mm = 'O comprimento deve ser um número inteiro.';
  }

  if (!formData.largura_mm.trim()) {
    newErrors.largura_mm = 'Informe a largura.';
  } else if (!REGEX.numeroInteiro.test(formData.largura_mm.trim())) {
    newErrors.largura_mm = 'A largura deve ser um número inteiro.';
  }

  if (!formData.altura_mm.trim()) {
    newErrors.altura_mm = 'Informe a altura.';
  } else if (!REGEX.numeroInteiro.test(formData.altura_mm.trim())) {
    newErrors.altura_mm = 'A altura deve ser um número inteiro.';
  }

  if (!formData.peso_gramas.trim()) {
    newErrors.peso_gramas = 'Informe o peso da peça.';
  } else if (!REGEX.numeroInteiro.test(formData.peso_gramas.trim())) {
    newErrors.peso_gramas = 'O peso deve ser informado apenas em números inteiros.';
  }

  if (!formData.detalhes_gravacao.trim()) {
    newErrors.detalhes_gravacao = 'Informe os detalhes de gravação.';
  }

  if (!formData.historico_proveniencia.trim()) {
    newErrors.historico_proveniencia = 'Informe o histórico de procedência.';
  }

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
}
  async function handleSubmit(e) {
    e.preventDefault();

    setMessage({ type: '', text: '' });

    if (!validateForm()) {
      setMessage({ type: 'error', text: 'Corrija os campos destacados antes de cadastrar a peça.' });
      return;
    }

    setLoading(true);

    const payload = {
      ...formData,
      preco: normalizePrice(formData.preco.trim()),
      nome_peca: formData.nome_peca.trim(),
      sku: formData.sku.trim(),
      oem_number: formData.oem_number.trim(),
      num_serie: formData.num_serie.trim(),
      categoria: formData.categoria.trim(),
      material: formData.material.trim(),
      detalhes_gravacao: formData.detalhes_gravacao.trim(),
      historico_proveniencia: formData.historico_proveniencia.trim(),
    };

    try {
      const response = await cadastrarPeca(payload);
      setMessage({ type: 'success', text: response.message || 'Peça cadastrada com sucesso!' });
      setFormData(INITIAL_FORM);
      setErrors({});
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Não foi possível cadastrar a peça. Revise os dados e tente novamente.',
      });
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: '100%',
    padding: SPACING.MD,
    border: '1px solid #ddd',
    borderRadius: '0.5rem',
    boxSizing: 'border-box',
  };

  const textAreaStyle = {
    width: '100%',
    padding: SPACING.MD,
    border: '1px solid #ddd',
    borderRadius: '0.5rem',
    boxSizing: 'border-box',
    minHeight: '100px',
  };

  const errorStyle = {
    marginTop: '6px',
    color: '#B91C1C',
    fontSize: '0.82rem',
    fontWeight: 600,
  };

  function getInputStyle(fieldName) {
    return {
      ...inputStyle,
      border: errors[fieldName] ? '1.5px solid #B91C1C' : '1px solid #ddd',
      boxShadow: errors[fieldName] ? '0 0 0 3px rgba(185, 28, 28, 0.10)' : 'none',
    };
  }

  function getTextAreaStyle(fieldName) {
    return {
      ...textAreaStyle,
      border: errors[fieldName] ? '1.5px solid #B91C1C' : '1px solid #ddd',
      boxShadow: errors[fieldName] ? '0 0 0 3px rgba(185, 28, 28, 0.10)' : 'none',
    };
  }

  function FieldError({ name }) {
    if (!errors[name]) return null;
    return <div style={errorStyle}>{errors[name]}</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

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
              type="button"
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

            >
              <SearchIcon size={17} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            type="button"
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
                    type="button"
                    style={{
                      width: '100%',
                      padding: `${SPACING.MD} ${SPACING.LG}`,
                      fontSize: '0.875rem',
                      color: BORDEAUX,
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: 'transparent',
                      textAlign: 'left',
                      fontWeight: 500,
                      borderBottom: '1px solid #F3E8D8',
                    }}
                    onClick={() => {
                      navigate('/dashboard');
                      setDropdownOpen(false);
                    }}
                  >
                    Dashboard
                  </button>

                  <button
                    type="button"
                    style={{
                      width: '100%',
                      padding: `${SPACING.MD} ${SPACING.LG}`,
                      fontSize: '0.875rem',
                      color: '#B91C1C',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: 'transparent',
                      textAlign: 'left',
                      fontWeight: 500,
                    }}
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
                  type="button"
                  style={{
                    width: '100%',
                    padding: `${SPACING.MD} ${SPACING.LG}`,
                    fontSize: '0.875rem',
                    color: BORDEAUX,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: 'transparent',
                    textAlign: 'left',
                    fontWeight: 500,
                  }}
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

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
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
                  type="button"
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
            <p style={{ fontSize: '0.75rem', marginBottom: '0.25rem', color: HIGHLIGHT, fontWeight: 700 }}>
              Cadastro Rápido
            </p>

            <p style={{ fontSize: '0.75rem', lineHeight: 1.5, color: 'rgba(255,255,255,0.65)' }}>
              Adicione novos itens ao catálogo de peças vintage.
            </p>

            <button
              type="button"
              style={{
                marginTop: SPACING.MD,
                width: '100%',
                padding: '0.375rem 0',
                borderRadius: '0.5rem',
                fontSize: '0.75rem',
                backgroundColor: HIGHLIGHT,
                color: BORDEAUX,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
              }}
              onClick={() => navigate('/')}
            >
              Home
            </button>
          </div>
        </aside>

        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            backgroundColor: CREAM,
            padding: SPACING.XXL,
          }}
        >
          <h1
            style={{
              color: BORDEAUX,
              fontFamily: "'Georgia', serif",
              fontSize: '1.8rem',
              fontWeight: 700,
              marginBottom: SPACING.SM,
            }}
          >
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
                fontSize: '0.95rem',
              }}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate style={{ maxWidth: '800px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACING.LG, marginBottom: SPACING.XL }}>
              <div>
                <label style={{ display: 'block', marginBottom: SPACING.SM, fontWeight: 600, color: BORDEAUX }}>
                  Nome da Peça *
                </label>
                <input
                  type="text"
                  name="nome_peca"
                  value={formData.nome_peca}
                  onChange={handleInputChange}
                  style={getInputStyle('nome_peca')}
                />
                <FieldError name="nome_peca" />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: SPACING.SM, fontWeight: 600, color: BORDEAUX }}>
                  SKU *
                </label>
                <input
                  type="text"
                  name="sku"
                  placeholder="Ex: OPALA-FRISO-001"
                  value={formData.sku}
                  onChange={handleInputChange}
                  style={getInputStyle('sku')}
                />
                <FieldError name="sku" />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: SPACING.SM, fontWeight: 600, color: BORDEAUX }}>
                  Número OEM
                </label>
                <input
                  type="text"
                  name="oem_number"
                  placeholder="Ex: GM-12345"
                  value={formData.oem_number}
                  onChange={handleInputChange}
                  style={getInputStyle('oem_number')}
                />
                <FieldError name="oem_number" />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: SPACING.SM, fontWeight: 600, color: BORDEAUX }}>
                  Número de Série
                </label>
                <input
                  type="text"
                  name="num_serie"
                  placeholder="Ex: SN-98765"
                  value={formData.num_serie}
                  onChange={handleInputChange}
                  style={getInputStyle('num_serie')}
                />
                <FieldError name="num_serie" />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: SPACING.SM, fontWeight: 600, color: BORDEAUX }}>
                  Categoria
                </label>
                <input
                  type="text"
                  name="categoria"
                  placeholder="Ex: Motor, Lataria, Elétrica"
                  value={formData.categoria}
                  onChange={handleInputChange}
                  style={getInputStyle('categoria')}
                />
                <FieldError name="categoria" />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: SPACING.SM, fontWeight: 600, color: BORDEAUX }}>
                  Material
                </label>
                <input
                  type="text"
                  name="material"
                  placeholder="Ex: Aço, Alumínio, Inox"
                  value={formData.material}
                  onChange={handleInputChange}
                  style={getInputStyle('material')}
                />
                <FieldError name="material" />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: SPACING.SM, fontWeight: 600, color: BORDEAUX }}>
                  Condição *
                </label>
                <select
                  name="condicao"
                  value={formData.condicao}
                  onChange={handleInputChange}
                  style={inputStyle}
                >
                  <option>NOS</option>
                  <option>EXCELENTE</option>
                  <option>BOM</option>
                  <option>ACEITÁVEL</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: SPACING.SM, fontWeight: 600, color: BORDEAUX }}>
                  Preço *
                </label>
                <input
                  type="text"
                  name="preco"
                  placeholder="Ex: 3490.00"
                  value={formData.preco}
                  onChange={handleInputChange}
                  style={getInputStyle('preco')}
                />
                <FieldError name="preco" />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: SPACING.SM, fontWeight: 600, color: BORDEAUX }}>
                  Estoque Atual *
                </label>
                <input
                  type="text"
                  name="estoque_atual"
                  placeholder="Ex: 3"
                  value={formData.estoque_atual}
                  onChange={handleInputChange}
                  style={getInputStyle('estoque_atual')}
                />
                <FieldError name="estoque_atual" />
              </div>
            </div>

            <div style={{ marginBottom: SPACING.XL }}>
              <label style={{ display: 'block', marginBottom: SPACING.SM, fontWeight: 600, color: BORDEAUX }}>
                Dimensões (mm)
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: SPACING.MD }}>
                <div>
                  <input
                    type="text"
                    name="comprimento_mm"
                    placeholder="Comprimento"
                    value={formData.comprimento_mm}
                    onChange={handleInputChange}
                    style={getInputStyle('comprimento_mm')}
                  />
                  <FieldError name="comprimento_mm" />
                </div>

                <div>
                  <input
                    type="text"
                    name="largura_mm"
                    placeholder="Largura"
                    value={formData.largura_mm}
                    onChange={handleInputChange}
                    style={getInputStyle('largura_mm')}
                  />
                  <FieldError name="largura_mm" />
                </div>

                <div>
                  <input
                    type="text"
                    name="altura_mm"
                    placeholder="Altura"
                    value={formData.altura_mm}
                    onChange={handleInputChange}
                    style={getInputStyle('altura_mm')}
                  />
                  <FieldError name="altura_mm" />
                </div>
              </div>
            </div>

            <div style={{ marginBottom: SPACING.XL }}>
              <label style={{ display: 'block', marginBottom: SPACING.SM, fontWeight: 600, color: BORDEAUX }}>
                Peso (gramas)
              </label>
              <input
                type="text"
                name="peso_gramas"
                placeholder="Ex: 5000"
                value={formData.peso_gramas}
                onChange={handleInputChange}
                style={getInputStyle('peso_gramas')}
              />
              <FieldError name="peso_gramas" />
            </div>

            <div style={{ marginBottom: SPACING.XL }}>
              <label style={{ display: 'block', marginBottom: SPACING.SM, fontWeight: 600, color: BORDEAUX }}>
                Detalhes de Gravação
              </label>
              <textarea
                name="detalhes_gravacao"
                value={formData.detalhes_gravacao}
                onChange={handleInputChange}
                style={getTextAreaStyle('detalhes_gravacao')}
              />
              <FieldError name="detalhes_gravacao" />
            </div>

            <div style={{ marginBottom: SPACING.XXL }}>
              <label style={{ display: 'block', marginBottom: SPACING.SM, fontWeight: 600, color: BORDEAUX }}>
                Histórico de Procedência
              </label>
              <textarea
                name="historico_proveniencia"
                value={formData.historico_proveniencia}
                onChange={handleInputChange}
                style={getTextAreaStyle('historico_proveniencia')}
              />
              <FieldError name="historico_proveniencia" />
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
            >
              {loading ? 'Cadastrando...' : '✓ Cadastrar Peça'}
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}