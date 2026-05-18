import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SearchIcon, UserIcon, ChevronDownIcon } from '../components/Icons';
import { listarMinhasPecas, listarCategorias, listarMateriais, buscarPecaPorId, atualizarPeca } from '../services/pecasService';
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
  categoria_id: '',
  material_id: '',
  condicao: 'NOS',
  peso_gramas: '',
  comprimento_mm: '',
  largura_mm: '',
  altura_mm: '',
  detalhes_gravacao: '',
  historico_proveniencia: '',
  preco: '',
  estoque_atual: '',
  imagem: '',
};

const REGEX = {
  nome_peca: /^[A-Za-zÀ-ÿ0-9\s.,ºª°/()-]{3,150}$/,
  sku: /^[A-Z0-9-]{3,30}$/,
  codigoOpcional: /^[A-Z0-9-]{2,50}$/,
  textoSimples: /^[A-Za-zÀ-ÿ0-9\s.,ºª°/()-]{2,80}$/,
  numeroInteiro: /^\d+$/,
  preco: /^\d+([.,]\d{1,2})?$/,
};

export default function EeditarPecas() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('Editar');
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);
  const imageInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [savingPeca, setSavingPeca] = useState(false);
  const [pecas, setPecas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [materiais, setMateriais] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [errors, setErrors] = useState({});
  
  const [selectedPecaId, setSelectedPecaId] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [imagemPreview, setImagemPreview] = useState('');
  const [pecasSearchQuery, setPecasSearchQuery] = useState('');

  useEffect(() => {
    async function carregarDados() {
      try {
        const [pecasData, categoriasData, materiaisData] = await Promise.all([
          listarMinhasPecas(),
          listarCategorias(),
          listarMateriais(),
        ]);

        setPecas(Array.isArray(pecasData) ? pecasData : []);
        setCategorias(Array.isArray(categoriasData) ? categoriasData : []);
        setMateriais(Array.isArray(materiaisData) ? materiaisData : []);
      } catch (error) {
        setMessage({
          type: 'error',
          text: error?.message || 'Não foi possível carregar as peças e opções.',
        });
      } finally {
        setLoading(false);
        setLoadingOptions(false);
      }
    }

    carregarDados();
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  function handleImageChange(e) {
    const file = e.target.files?.[0];

    setMessage({ type: '', text: '' });

    if (!file) {
      setFormData((prev) => ({
        ...prev,
        imagem: '',
      }));
      setImagemPreview('');
      return;
    }

    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp'];

    if (!tiposPermitidos.includes(file.type)) {
      setMessage({
        type: 'error',
        text: 'Selecione uma imagem nos formatos JPG, PNG ou WEBP.',
      });

      setFormData((prev) => ({
        ...prev,
        imagem: '',
      }));

      setImagemPreview('');

      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }

      return;
    }

    const tamanhoMaximoMB = 2;
    const tamanhoMaximoBytes = tamanhoMaximoMB * 1024 * 1024;

    if (file.size > tamanhoMaximoBytes) {
      setMessage({
        type: 'error',
        text: `A imagem deve ter no máximo ${tamanhoMaximoMB}MB.`,
      });

      setFormData((prev) => ({
        ...prev,
        imagem: '',
      }));

      setImagemPreview('');

      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }

      return;
    }

    const reader = new FileReader();

    reader.onloadend = () => {
      const imagemBase64 = reader.result;

      setFormData((prev) => ({
        ...prev,
        imagem: imagemBase64,
      }));

      setImagemPreview(imagemBase64);
    };

    reader.readAsDataURL(file);
  }

  function removerImagem() {
    setFormData((prev) => ({
      ...prev,
      imagem: '',
    }));

    setImagemPreview('');

    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }

    setMessage({ type: '', text: '' });
  }

  async function handleSelectPeca(pecaId) {
    setSelectedPecaId(pecaId);
    setMessage({ type: '', text: '' });
    setErrors({});

    try {
      const peca = await buscarPecaPorId(pecaId);

      setFormData({
        nome_peca: peca?.nome_peca || '',
        sku: peca?.sku || '',
        oem_number: peca?.oem_number || '',
        num_serie: peca?.num_serie || '',
        categoria_id: peca?.categoria_id || '',
        material_id: peca?.material_id || '',
        condicao: peca?.condicao || 'NOS',
        peso_gramas: peca?.peso_gramas || '',
        comprimento_mm: peca?.comprimento_mm || '',
        largura_mm: peca?.largura_mm || '',
        altura_mm: peca?.altura_mm || '',
        detalhes_gravacao: peca?.detalhes_gravacao || '',
        historico_proveniencia: peca?.historico_proveniencia || '',
        preco: peca?.preco || '',
        estoque_atual: peca?.estoque_atual || '',
        imagem: peca?.imagem || '',
      });

      setImagemPreview(peca?.imagem || '');

      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error?.message || 'Não foi possível carregar a peça selecionada.',
      });
      setSelectedPecaId(null);
    }
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

    if (!formData.categoria_id) {
      newErrors.categoria_id = 'Selecione a categoria da peça.';
    }

    if (!formData.material_id) {
      newErrors.material_id = 'Selecione o material da peça.';
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
      setMessage({ type: 'error', text: 'Corrija os campos destacados antes de salvar.' });
      return;
    }

    setSavingPeca(true);

    const payload = {
      nome_peca: formData.nome_peca.trim(),
      sku: formData.sku.trim(),
      oem_number: formData.oem_number.trim(),
      num_serie: formData.num_serie.trim(),
      categoria_id: formData.categoria_id,
      material_id: formData.material_id,
      condicao: formData.condicao,
      peso_gramas: formData.peso_gramas ? parseInt(formData.peso_gramas, 10) : null,
      comprimento_mm: formData.comprimento_mm ? parseInt(formData.comprimento_mm, 10) : null,
      largura_mm: formData.largura_mm ? parseInt(formData.largura_mm, 10) : null,
      altura_mm: formData.altura_mm ? parseInt(formData.altura_mm, 10) : null,
      detalhes_gravacao: formData.detalhes_gravacao.trim(),
      historico_proveniencia: formData.historico_proveniencia.trim(),
      preco: normalizePrice(formData.preco.trim()),
      estoque_atual: formData.estoque_atual ? parseInt(formData.estoque_atual, 10) : 0,
      imagem: formData.imagem || '',
    };

    try {
      const response = await atualizarPeca(selectedPecaId, payload);
      setMessage({ type: 'success', text: response.message || 'Peça atualizada com sucesso!' });

      // Atualizar a peça na lista
      setPecas((prevPecas) =>
        prevPecas.map((p) =>
          p.id === selectedPecaId ? { ...p, ...response.peca } : p
        )
      );
    } catch (error) {
      setMessage({
        type: 'error',
        text: error?.message || 'Não foi possível atualizar a peça.',
      });
    } finally {
      setSavingPeca(false);
    }
  }

  const filteredPecas = pecas.filter((peca) =>
    peca.nome_peca.toLowerCase().includes(pecasSearchQuery.toLowerCase()) ||
    peca.sku.toLowerCase().includes(pecasSearchQuery.toLowerCase())
  );

  const inputStyle = {
    width: '100%',
    padding: SPACING.MD,
    border: '1px solid #ddd',
    borderRadius: '0.5rem',
    boxSizing: 'border-box',
    fontSize: '14px',
  };

  const textAreaStyle = {
    width: '100%',
    padding: SPACING.MD,
    border: '1px solid #ddd',
    borderRadius: '0.5rem',
    boxSizing: 'border-box',
    minHeight: '100px',
    fontSize: '14px',
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

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#f3ead7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: BORDEAUX,
        }}
      >
        Carregando suas peças...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f3ead7', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div
        style={{
          padding: SPACING.LG,
          backgroundColor: BORDEAUX,
          color: CREAM,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>BigPeças</h1>
        <div style={{ display: 'flex', gap: SPACING.MD, alignItems: 'center' }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: CREAM,
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            ← Voltar ao dashboard
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Lista de Peças */}
        <div
          style={{
            width: '35%',
            borderRight: '1px solid #ddd',
            backgroundColor: '#fff',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
          }}
        >
          <div style={{ padding: SPACING.LG, borderBottom: '1px solid #ddd' }}>
            <h2
              style={{
                margin: '0 0 12px 0',
                fontSize: '18px',
                fontWeight: 700,
                color: BORDEAUX,
              }}
            >
              Suas Peças ({filteredPecas.length})
            </h2>
            <input
              type="text"
              placeholder="Buscar por nome ou SKU..."
              value={pecasSearchQuery}
              onChange={(e) => setPecasSearchQuery(e.target.value)}
              style={{
                ...inputStyle,
                padding: '10px 12px',
              }}
            />
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredPecas.length === 0 ? (
              <div
                style={{
                  padding: SPACING.LG,
                  textAlign: 'center',
                  color: '#999',
                }}
              >
                {pecas.length === 0
                  ? 'Você não tem peças cadastradas ainda.'
                  : 'Nenhuma peça encontrada com esses critérios.'}
              </div>
            ) : (
              filteredPecas.map((peca) => (
                <div
                  key={peca.id}
                  onClick={() => handleSelectPeca(peca.id)}
                  style={{
                    padding: SPACING.MD,
                    borderBottom: '1px solid #eee',
                    cursor: 'pointer',
                    backgroundColor: selectedPecaId === peca.id ? '#f0e6d2' : 'transparent',
                    transition: 'background-color 0.2s',
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      color: BORDEAUX,
                      marginBottom: '4px',
                    }}
                  >
                    {peca.nome_peca}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#666',
                      marginBottom: '4px',
                    }}
                  >
                    SKU: {peca.sku}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#999',
                    }}
                  >
                    R$ {typeof peca.preco === 'number' ? peca.preco.toFixed(2) : peca.preco}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Formulário de Edição */}
        <div
          style={{
            width: '65%',
            backgroundColor: '#f3ead7',
            overflowY: 'auto',
            padding: SPACING.XL,
          }}
        >
          {selectedPecaId ? (
            <form onSubmit={handleSubmit} noValidate>
              <h2
                style={{
                  margin: '0 0 24px 0',
                  fontSize: '24px',
                  fontWeight: 700,
                  color: BORDEAUX,
                }}
              >
                Editar Peça
              </h2>

              {message.text && (
                <div
                  style={{
                    padding: SPACING.MD,
                    marginBottom: SPACING.MD,
                    backgroundColor: message.type === 'success' ? '#d1fae5' : '#fee2e2',
                    color: message.type === 'success' ? '#065f46' : '#7B1D2E',
                    borderRadius: '0.5rem',
                    fontWeight: 500,
                  }}
                >
                  {message.text}
                </div>
              )}

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: SPACING.MD,
                }}
              >
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: BORDEAUX }}>
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
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: BORDEAUX }}>
                    SKU *
                  </label>
                  <input
                    type="text"
                    name="sku"
                    value={formData.sku}
                    onChange={handleInputChange}
                    style={getInputStyle('sku')}
                  />
                  <FieldError name="sku" />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: BORDEAUX }}>
                    Número OEM *
                  </label>
                  <input
                    type="text"
                    name="oem_number"
                    value={formData.oem_number}
                    onChange={handleInputChange}
                    style={getInputStyle('oem_number')}
                  />
                  <FieldError name="oem_number" />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: BORDEAUX }}>
                    Número de Série *
                  </label>
                  <input
                    type="text"
                    name="num_serie"
                    value={formData.num_serie}
                    onChange={handleInputChange}
                    style={getInputStyle('num_serie')}
                  />
                  <FieldError name="num_serie" />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: BORDEAUX }}>
                    Categoria *
                  </label>
                  <select
                    name="categoria_id"
                    value={formData.categoria_id}
                    onChange={handleInputChange}
                    style={getInputStyle('categoria_id')}
                  >
                    <option value="">Selecione uma categoria</option>
                    {categorias.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.nome_categoria}
                      </option>
                    ))}
                  </select>
                  <FieldError name="categoria_id" />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: BORDEAUX }}>
                    Material *
                  </label>
                  <select
                    name="material_id"
                    value={formData.material_id}
                    onChange={handleInputChange}
                    style={getInputStyle('material_id')}
                  >
                    <option value="">Selecione um material</option>
                    {materiais.map((mat) => (
                      <option key={mat.id} value={mat.id}>
                        {mat.nome_material}
                      </option>
                    ))}
                  </select>
                  <FieldError name="material_id" />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: BORDEAUX }}>
                    Condição
                  </label>
                  <select
                    name="condicao"
                    value={formData.condicao}
                    onChange={handleInputChange}
                    style={getInputStyle('condicao')}
                  >
                    <option value="NOS">NOS (Novo em Estoque)</option>
                    <option value="USED">USED (Usado)</option>
                    <option value="REFURBISHED">REFURBISHED (Refabricado)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: BORDEAUX }}>
                    Preço (R$) *
                  </label>
                  <input
                    type="text"
                    name="preco"
                    value={formData.preco}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    style={getInputStyle('preco')}
                  />
                  <FieldError name="preco" />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: BORDEAUX }}>
                    Estoque Atual *
                  </label>
                  <input
                    type="number"
                    name="estoque_atual"
                    value={formData.estoque_atual}
                    onChange={handleInputChange}
                    style={getInputStyle('estoque_atual')}
                  />
                  <FieldError name="estoque_atual" />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: BORDEAUX }}>
                    Peso (gramas) *
                  </label>
                  <input
                    type="number"
                    name="peso_gramas"
                    value={formData.peso_gramas}
                    onChange={handleInputChange}
                    style={getInputStyle('peso_gramas')}
                  />
                  <FieldError name="peso_gramas" />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: BORDEAUX }}>
                    Comprimento (mm) *
                  </label>
                  <input
                    type="number"
                    name="comprimento_mm"
                    value={formData.comprimento_mm}
                    onChange={handleInputChange}
                    style={getInputStyle('comprimento_mm')}
                  />
                  <FieldError name="comprimento_mm" />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: BORDEAUX }}>
                    Largura (mm) *
                  </label>
                  <input
                    type="number"
                    name="largura_mm"
                    value={formData.largura_mm}
                    onChange={handleInputChange}
                    style={getInputStyle('largura_mm')}
                  />
                  <FieldError name="largura_mm" />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: BORDEAUX }}>
                    Altura (mm) *
                  </label>
                  <input
                    type="number"
                    name="altura_mm"
                    value={formData.altura_mm}
                    onChange={handleInputChange}
                    style={getInputStyle('altura_mm')}
                  />
                  <FieldError name="altura_mm" />
                </div>
              </div>

              <div style={{ marginTop: SPACING.LG }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: BORDEAUX }}>
                  Detalhes de Gravação *
                </label>
                <textarea
                  name="detalhes_gravacao"
                  value={formData.detalhes_gravacao}
                  onChange={handleInputChange}
                  rows={3}
                  style={getTextAreaStyle('detalhes_gravacao')}
                />
                <FieldError name="detalhes_gravacao" />
              </div>

              <div style={{ marginTop: SPACING.LG }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: BORDEAUX }}>
                  Histórico de Procedência *
                </label>
                <textarea
                  name="historico_proveniencia"
                  value={formData.historico_proveniencia}
                  onChange={handleInputChange}
                  rows={3}
                  style={getTextAreaStyle('historico_proveniencia')}
                />
                <FieldError name="historico_proveniencia" />
              </div>

              <div style={{ marginTop: SPACING.LG }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: BORDEAUX }}>
                  Imagem da Peça
                </label>
                {imagemPreview && (
                  <div style={{ marginBottom: SPACING.MD }}>
                    <img
                      src={imagemPreview}
                      alt="Preview"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '200px',
                        borderRadius: '0.5rem',
                        marginBottom: SPACING.SM,
                      }}
                    />
                    <button
                      type="button"
                      onClick={removerImagem}
                      style={{
                        backgroundColor: '#fee2e2',
                        color: '#7B1D2E',
                        border: 'none',
                        padding: '8px 12px',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '14px',
                      }}
                    >
                      Remover imagem
                    </button>
                  </div>
                )}
                <input
                  type="file"
                  ref={imageInputRef}
                  onChange={handleImageChange}
                  accept="image/jpeg,image/png,image/webp"
                  style={{
                    ...inputStyle,
                    padding: '10px 12px',
                  }}
                />
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  Formatos aceitos: JPG, PNG, WEBP (máx. 2MB)
                </div>
              </div>

              <div style={{ display: 'flex', gap: SPACING.MD, marginTop: SPACING.XL }}>
                <button
                  type="submit"
                  disabled={savingPeca}
                  style={{
                    backgroundColor: HIGHLIGHT,
                    color: '#3a1a16',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '9999px',
                    fontWeight: 700,
                    cursor: savingPeca ? 'not-allowed' : 'pointer',
                    opacity: savingPeca ? 0.7 : 1,
                  }}
                >
                  {savingPeca ? 'Salvando...' : 'Salvar alterações'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedPecaId(null);
                    setFormData(INITIAL_FORM);
                    setImagemPreview('');
                    setErrors({});
                    setMessage({ type: '', text: '' });
                  }}
                  style={{
                    backgroundColor: '#fff',
                    color: BORDEAUX,
                    border: '1px solid #ddd',
                    padding: '12px 24px',
                    borderRadius: '9999px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Limpar formulário
                </button>
              </div>
            </form>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#999',
                textAlign: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
                  Selecione uma peça para editar
                </div>
                <div style={{ fontSize: '14px' }}>
                  Clique em qualquer peça na lista à esquerda para começar
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
