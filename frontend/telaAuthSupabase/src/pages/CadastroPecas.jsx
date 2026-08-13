/**
 * CadastroPecas.jsx
 * Tela de cadastro de peças ajustada para usar o padrão visual verde do BigPeças.
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { cadastrarPeca, listarCategorias, listarMateriais } from '../services/pecasService';
import { buscarPerfilUsuario, salvarPerfilUsuario } from '../services/usuarioService';
import {
  BORDER_RADIUS,
  BUTTON_PRIMARY_STYLE,
  BUTTON_SECONDARY_STYLE,
  CARD_STYLE,
  COLORS,
  SHADOWS,
  SPACING,
} from '../styles/theme';
import { parseUnexpectedError } from '../utils/friendlyErrors';

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
  numeroInteiro: /^\d+$/,
  preco: /^\d+([.,]\d{1,2})?$/,
  loja: /^[A-Za-zÀ-ÿ0-9\s.'-]{3,150}$/,
};

const fieldBaseStyle = {
  width: '100%',
  padding: '0.75rem 1rem',
  border: `1.5px solid ${COLORS.BORDER}`,
  borderRadius: BORDER_RADIUS.MD,
  fontSize: '0.93rem',
  color: COLORS.DARK_TEXT,
  backgroundColor: '#fff',
  outline: 'none',
  boxSizing: 'border-box',
};

const textareaBaseStyle = {
  ...fieldBaseStyle,
  minHeight: 110,
  resize: 'vertical',
};

const labelStyle = {
  display: 'block',
  marginBottom: SPACING.SM,
  color: COLORS.MUTED_TEXT,
  fontSize: '0.78rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const errorStyle = {
  marginTop: SPACING.XS,
  color: COLORS.ERROR_DARK || '#B91C1C',
  fontSize: '0.78rem',
  fontWeight: 600,
};

function normalizeCode(value) {
  return value.toUpperCase().replace(/\s/g, '');
}

function normalizePrice(value) {
  return value.replace(',', '.');
}

function getFieldStyle(hasError, baseStyle = fieldBaseStyle) {
  return {
    ...baseStyle,
    borderColor: hasError ? '#B91C1C' : COLORS.BORDER,
    backgroundColor: hasError ? '#FFF7F7' : '#fff',
    boxShadow: hasError ? '0 0 0 3px rgba(185, 28, 28, 0.10)' : 'none',
  };
}

function FieldError({ message }) {
  if (!message) return null;
  return <div style={errorStyle}>{message}</div>;
}

function FormGroup({ label, required, error, children, style }) {
  return (
    <div style={style}>
      <label style={labelStyle}>
        {label}{required ? ' *' : ''}
      </label>
      {children}
      <FieldError message={error} />
    </div>
  );
}

function InfoModal({ open, title, text, onClose }) {
  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.48)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: SPACING.LG,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 460,
          backgroundColor: '#fff',
          borderRadius: BORDER_RADIUS.LG,
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          border: `1px solid ${COLORS.BORDER}`,
        }}
      >
        <div
          style={{
            backgroundColor: COLORS.BORDEAUX,
            color: COLORS.CREAM,
            padding: SPACING.LG,
          }}
        >
          <h2
            style={{
              margin: 0,
              color: COLORS.CREAM,
              fontSize: '1.25rem',
              fontFamily: 'Georgia, serif',
            }}
          >
            {title}
          </h2>
        </div>

        <div style={{ padding: SPACING.LG }}>
          <p
            style={{
              margin: 0,
              color: COLORS.DARK_TEXT,
              lineHeight: 1.6,
              fontSize: '0.96rem',
            }}
          >
            {text}
          </p>

          <div
            style={{
              marginTop: SPACING.LG,
              display: 'flex',
              justifyContent: 'flex-end',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={BUTTON_PRIMARY_STYLE}
            >
              Entendi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CadastroPecas() {
  const navigate = useNavigate();
  const imageInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingStore, setSavingStore] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [materiais, setMateriais] = useState([]);
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState('');
  const [storeForm, setStoreForm] = useState({ nome_loja: '', descricao_loja: '' });
  const [storeErrors, setStoreErrors] = useState({});
  const [message, setMessage] = useState({ type: '', text: '' });
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [imagemPreview, setImagemPreview] = useState('');
  const [modal, setModal] = useState({ open: false, title: '', text: '' });

  const storeConfigured = Boolean(
    profile?.nome_loja?.trim() && profile?.descricao_loja?.trim()
  );

  async function carregarPerfil() {
    setLoadingProfile(true);
    setProfileError('');

    try {
      const perfil = await buscarPerfilUsuario();

      setProfile(perfil);
      setStoreForm({
        nome_loja: perfil?.nome_loja || '',
        descricao_loja: perfil?.descricao_loja || '',
      });
    } catch (error) {
      setProfileError(
        parseUnexpectedError(error, 'Não foi possível verificar os dados da sua loja agora.')
      );
    } finally {
      setLoadingProfile(false);
    }
  }

  useEffect(() => {
    carregarPerfil();
  }, []);

  useEffect(() => {
    async function carregarOpcoes() {
      setLoadingOptions(true);

      try {
        const [categoriasData, materiaisData] = await Promise.all([
          listarCategorias(),
          listarMateriais(),
        ]);

        setCategorias(Array.isArray(categoriasData) ? categoriasData : []);
        setMateriais(Array.isArray(materiaisData) ? materiaisData : []);
      } catch (error) {
        setMessage({
          type: 'error',
          text: parseUnexpectedError(error, 'Não foi possível carregar categorias e materiais agora.'),
        });
      } finally {
        setLoadingOptions(false);
      }
    }

    if (storeConfigured) {
      carregarOpcoes();
    }
  }, [storeConfigured]);

  function handleStoreChange(e) {
    const { name, value } = e.target;

    setStoreForm((prev) => ({ ...prev, [name]: value }));
    setStoreErrors((prev) => ({ ...prev, [name]: '' }));
    setMessage({ type: '', text: '' });
  }

  function validateStoreForm() {
    const newErrors = {};

    if (!storeForm.nome_loja.trim()) {
      newErrors.nome_loja = 'Informe o nome da loja.';
    } else if (!REGEX.loja.test(storeForm.nome_loja.trim())) {
      newErrors.nome_loja = 'Use pelo menos 3 caracteres válidos no nome da loja.';
    }

    if (!storeForm.descricao_loja.trim()) {
      newErrors.descricao_loja = 'Informe a descrição da loja.';
    } else if (storeForm.descricao_loja.trim().length < 10) {
      newErrors.descricao_loja = 'Descreva sua loja usando pelo menos 10 caracteres.';
    }

    setStoreErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleStoreSubmit(e) {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!validateStoreForm()) {
      return;
    }

    setSavingStore(true);

    try {
      const perfilAtualizado = await salvarPerfilUsuario({
        full_name: profile?.full_name || '',
        gender: profile?.gender || '',
        cep: profile?.cep || '',
        tipo_usuario: 'ambos',
        nome_loja: storeForm.nome_loja.trim(),
        descricao_loja: storeForm.descricao_loja.trim(),
        telefone: profile?.telefone || '',
      });

      setProfile((currentProfile) => ({
        ...currentProfile,
        ...perfilAtualizado,
        tipo_usuario: 'ambos',
        nome_loja: perfilAtualizado?.nome_loja || storeForm.nome_loja.trim(),
        descricao_loja:
          perfilAtualizado?.descricao_loja || storeForm.descricao_loja.trim(),
      }));
      setStoreErrors({});
      setMessage({
        type: 'success',
        text: 'Loja configurada com sucesso. Agora você já pode anunciar sua peça.',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: parseUnexpectedError(error, 'Não foi possível salvar os dados da loja agora.'),
      });
    } finally {
      setSavingStore(false);
    }
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
      setFormData((prev) => ({ ...prev, imagem: '' }));
      setImagemPreview('');
      return;
    }

    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp'];

    if (!tiposPermitidos.includes(file.type)) {
      setMessage({
        type: 'error',
        text: 'Selecione uma imagem nos formatos JPG, PNG ou WEBP.',
      });

      setFormData((prev) => ({ ...prev, imagem: '' }));
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

      setFormData((prev) => ({ ...prev, imagem: '' }));
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
    setFormData((prev) => ({ ...prev, imagem: '' }));
    setImagemPreview('');

    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }

    setMessage({ type: '', text: '' });
  }

  function abrirModal(title, text) {
    setModal({ open: true, title, text });
  }

  function fecharModal() {
    setModal({ open: false, title: '', text: '' });
  }

  function tratarErroCadastro(error) {
    const textoErro = parseUnexpectedError(
      error,
      'Não foi possível cadastrar a peça. Revise os dados e tente novamente.'
    );
    const textoNormalizado = textoErro.toLowerCase();

    if (
      textoNormalizado.includes('confirme seu e-mail') ||
      textoNormalizado.includes('confirme seu email') ||
      textoNormalizado.includes('e-mail antes de cadastrar') ||
      textoNormalizado.includes('email antes de cadastrar')
    ) {
      abrirModal(
        'Confirmação de e-mail necessária',
        'Você já pode acessar sua conta, mas precisa confirmar seu e-mail antes de cadastrar peças. Verifique sua caixa de entrada e clique no link de confirmação.'
      );
      return;
    }

    if (textoNormalizado.includes('configure o nome e a descrição da sua loja')) {
      setProfile((currentProfile) => ({
        ...currentProfile,
        nome_loja: '',
        descricao_loja: '',
      }));
      setMessage({
        type: 'error',
        text: 'Configure os dados da sua loja antes de cadastrar uma peça.',
      });
      return;
    }

    setMessage({ type: 'error', text: textoErro });
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
      categoria_id: formData.categoria_id,
      material_id: formData.material_id,
      detalhes_gravacao: formData.detalhes_gravacao.trim(),
      historico_proveniencia: formData.historico_proveniencia.trim(),
      imagem: formData.imagem || '',
    };

    try {
      const response = await cadastrarPeca(payload);

      setMessage({
        type: 'success',
        text: response?.message || 'Peça cadastrada com sucesso!',
      });
      setFormData(INITIAL_FORM);
      setImagemPreview('');
      setErrors({});

      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    } catch (error) {
      tratarErroCadastro(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.CREAM }}>
      <InfoModal
        open={modal.open}
        title={modal.title}
        text={modal.text}
        onClose={fecharModal}
      />

      <Header />

      <main
        style={{
          width: '100%',
          maxWidth: 1120,
          margin: '0 auto',
          padding: `${SPACING.XL} ${SPACING.LG} ${SPACING.XXL}`,
        }}
      >
        <div className="page-header">
          <div className="page-breadcrumb">
            <button type="button" onClick={() => navigate('/')}>
              Início
            </button>
            <span>›</span>
            <button type="button" onClick={() => navigate('/buscaPecas')}>
              Catálogo
            </button>
            <span>›</span>
            <span className="current">Cadastrar peça</span>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              gap: SPACING.LG,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <p
                style={{
                  margin: `0 0 ${SPACING.XS}`,
                  color: COLORS.HIGHLIGHT,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  fontSize: '0.72rem',
                }}
              >
                Catálogo BigPeças
              </p>

              <h1 className="page-title">Cadastrar Peça</h1>
              <p className="page-subtitle">
                {storeConfigured
                  ? `Anuncie uma peça pela loja ${profile.nome_loja}.`
                  : 'Configure sua loja uma única vez para começar a vender.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/editar-pecas')}
              style={BUTTON_SECONDARY_STYLE}
            >
              Minhas peças
            </button>
          </div>
        </div>

        {message.text && (
          <div
            style={{
              padding: SPACING.MD,
              marginBottom: SPACING.LG,
              borderRadius: BORDER_RADIUS.MD,
              backgroundColor: message.type === 'success' ? COLORS.SUCCESS : COLORS.ERROR,
              color: message.type === 'success' ? COLORS.SUCCESS_DARK : COLORS.ERROR_DARK,
              border: `1.5px solid ${message.type === 'success' ? COLORS.SUCCESS_BORDER : COLORS.ERROR_BORDER}`,
              boxShadow: SHADOWS.SM,
              fontSize: '0.95rem',
              fontWeight: 600,
            }}
          >
            {message.text}
          </div>
        )}

        {loadingProfile && (
          <section style={{ ...CARD_STYLE, padding: SPACING.XL, textAlign: 'center' }}>
            <p style={{ margin: 0, color: COLORS.MUTED_TEXT, fontWeight: 700 }}>
              Verificando os dados da sua loja...
            </p>
          </section>
        )}

        {!loadingProfile && profileError && (
          <section style={{ ...CARD_STYLE, padding: SPACING.XL, textAlign: 'center' }}>
            <h2 style={{ margin: 0, color: COLORS.BORDEAUX, fontFamily: 'Georgia, serif' }}>
              Não foi possível verificar sua loja
            </h2>
            <p style={{ color: COLORS.MUTED_TEXT, lineHeight: 1.6 }}>{profileError}</p>
            <button type="button" onClick={carregarPerfil} style={BUTTON_PRIMARY_STYLE}>
              Tentar novamente
            </button>
          </section>
        )}

        {!loadingProfile && !profileError && !storeConfigured && (
          <form onSubmit={handleStoreSubmit} noValidate>
            <section style={{ ...CARD_STYLE, padding: SPACING.XL }}>
              <div
                style={{
                  display: 'inline-flex',
                  padding: `${SPACING.XS} ${SPACING.MD}`,
                  marginBottom: SPACING.MD,
                  borderRadius: BORDER_RADIUS.FULL,
                  backgroundColor: `${COLORS.HIGHLIGHT}22`,
                  color: COLORS.BORDEAUX,
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Primeira venda
              </div>

              <h2
                style={{
                  margin: 0,
                  color: COLORS.BORDEAUX,
                  fontSize: '1.45rem',
                  fontFamily: 'Georgia, serif',
                }}
              >
                Antes de anunciar, conte sobre sua loja
              </h2>
              <p
                style={{
                  margin: `${SPACING.SM} 0 ${SPACING.XL}`,
                  color: COLORS.MUTED_TEXT,
                  lineHeight: 1.6,
                }}
              >
                Estes dados serão exibidos aos compradores e só precisam ser preenchidos uma vez.
                Depois você poderá alterá-los no seu perfil.
              </p>

              <div style={{ display: 'grid', gap: SPACING.LG }}>
                <FormGroup label="Nome da loja" required error={storeErrors.nome_loja}>
                  <input
                    type="text"
                    name="nome_loja"
                    placeholder="Ex: Auto Peças Garabetti"
                    value={storeForm.nome_loja}
                    onChange={handleStoreChange}
                    maxLength={150}
                    style={getFieldStyle(storeErrors.nome_loja)}
                  />
                </FormGroup>

                <FormGroup
                  label="Descrição da loja"
                  required
                  error={storeErrors.descricao_loja}
                >
                  <textarea
                    name="descricao_loja"
                    placeholder="Ex: Loja especializada em peças antigas e difíceis de encontrar"
                    value={storeForm.descricao_loja}
                    onChange={handleStoreChange}
                    maxLength={500}
                    style={getFieldStyle(storeErrors.descricao_loja, textareaBaseStyle)}
                  />
                </FormGroup>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  marginTop: SPACING.XL,
                }}
              >
                <button
                  type="submit"
                  disabled={savingStore}
                  style={{
                    ...BUTTON_PRIMARY_STYLE,
                    opacity: savingStore ? 0.7 : 1,
                    cursor: savingStore ? 'not-allowed' : 'pointer',
                  }}
                >
                  {savingStore ? 'Salvando loja...' : 'Salvar e continuar'}
                </button>
              </div>
            </section>
          </form>
        )}

        {!loadingProfile && !profileError && storeConfigured && (
          <form onSubmit={handleSubmit} noValidate>
          <section
            style={{
              ...CARD_STYLE,
              padding: SPACING.XL,
              marginBottom: SPACING.LG,
            }}
          >
            <div style={{ marginBottom: SPACING.LG }}>
              <h2
                style={{
                  margin: 0,
                  color: COLORS.BORDEAUX,
                  fontSize: '1.2rem',
                  fontFamily: 'Georgia, serif',
                }}
              >
                Dados principais
              </h2>
              <p
                style={{
                  margin: `${SPACING.XS} 0 0`,
                  color: COLORS.MUTED_TEXT,
                  fontSize: '0.9rem',
                }}
              >
                Identificação, categoria, material, preço e estoque da peça.
              </p>
            </div>

            <div className="form-grid-2">
              <FormGroup label="Nome da peça" required error={errors.nome_peca}>
                <input
                  type="text"
                  name="nome_peca"
                  value={formData.nome_peca}
                  onChange={handleInputChange}
                  style={getFieldStyle(errors.nome_peca)}
                />
              </FormGroup>

              <FormGroup label="SKU" required error={errors.sku}>
                <input
                  type="text"
                  name="sku"
                  placeholder="Ex: OPALA-FRISO-001"
                  value={formData.sku}
                  onChange={handleInputChange}
                  style={getFieldStyle(errors.sku)}
                />
              </FormGroup>

              <FormGroup label="Número OEM" required error={errors.oem_number}>
                <input
                  type="text"
                  name="oem_number"
                  placeholder="Ex: GM-12345"
                  value={formData.oem_number}
                  onChange={handleInputChange}
                  style={getFieldStyle(errors.oem_number)}
                />
              </FormGroup>

              <FormGroup label="Número de série" required error={errors.num_serie}>
                <input
                  type="text"
                  name="num_serie"
                  placeholder="Ex: SN-98765"
                  value={formData.num_serie}
                  onChange={handleInputChange}
                  style={getFieldStyle(errors.num_serie)}
                />
              </FormGroup>

              <FormGroup label="Categoria" required error={errors.categoria_id}>
                <select
                  name="categoria_id"
                  value={formData.categoria_id}
                  onChange={handleInputChange}
                  disabled={loadingOptions}
                  style={getFieldStyle(errors.categoria_id)}
                >
                  <option value="">
                    {loadingOptions ? 'Carregando categorias...' : 'Selecione uma categoria'}
                  </option>
                  {categorias.map((categoria) => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.nome}
                    </option>
                  ))}
                </select>
              </FormGroup>

              <FormGroup label="Material" required error={errors.material_id}>
                <select
                  name="material_id"
                  value={formData.material_id}
                  onChange={handleInputChange}
                  disabled={loadingOptions}
                  style={getFieldStyle(errors.material_id)}
                >
                  <option value="">
                    {loadingOptions ? 'Carregando materiais...' : 'Selecione um material'}
                  </option>
                  {materiais.map((material) => (
                    <option key={material.id} value={material.id}>
                      {material.nome}
                    </option>
                  ))}
                </select>
              </FormGroup>

              <FormGroup label="Condição" required>
                <select
                  name="condicao"
                  value={formData.condicao}
                  onChange={handleInputChange}
                  style={fieldBaseStyle}
                >
                  <option value="NOS">NOS</option>
                  <option value="EXCELENTE">EXCELENTE</option>
                  <option value="BOM">BOM</option>
                  <option value="ACEITÁVEL">ACEITÁVEL</option>
                </select>
              </FormGroup>

              <FormGroup label="Preço" required error={errors.preco}>
                <input
                  type="text"
                  name="preco"
                  placeholder="Ex: 3490.00"
                  value={formData.preco}
                  onChange={handleInputChange}
                  style={getFieldStyle(errors.preco)}
                />
              </FormGroup>

              <FormGroup label="Estoque atual" required error={errors.estoque_atual}>
                <input
                  type="text"
                  name="estoque_atual"
                  placeholder="Ex: 3"
                  value={formData.estoque_atual}
                  onChange={handleInputChange}
                  style={getFieldStyle(errors.estoque_atual)}
                />
              </FormGroup>
            </div>
          </section>

          <section
            style={{
              ...CARD_STYLE,
              padding: SPACING.XL,
              marginBottom: SPACING.LG,
            }}
          >
            <div style={{ marginBottom: SPACING.LG }}>
              <h2
                style={{
                  margin: 0,
                  color: COLORS.BORDEAUX,
                  fontSize: '1.2rem',
                  fontFamily: 'Georgia, serif',
                }}
              >
                Imagem e especificações
              </h2>
              <p
                style={{
                  margin: `${SPACING.XS} 0 0`,
                  color: COLORS.MUTED_TEXT,
                  fontSize: '0.9rem',
                }}
              >
                Foto, dimensões, peso e informações técnicas da peça.
              </p>
            </div>

            <FormGroup label="Imagem da peça">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleImageChange}
                style={{
                  ...fieldBaseStyle,
                  cursor: 'pointer',
                }}
              />

              <p
                style={{
                  margin: `${SPACING.SM} 0 0`,
                  fontSize: '0.82rem',
                  color: COLORS.MUTED_TEXT,
                }}
              >
                Formatos aceitos: JPG, PNG ou WEBP. Tamanho máximo: 2MB.
              </p>

              {imagemPreview && (
                <div
                  style={{
                    marginTop: SPACING.MD,
                    display: 'flex',
                    alignItems: 'center',
                    gap: SPACING.MD,
                    padding: SPACING.MD,
                    backgroundColor: '#FAF4E8',
                    borderRadius: BORDER_RADIUS.LG,
                    border: `1px solid ${COLORS.BORDER}`,
                    flexWrap: 'wrap',
                  }}
                >
                  <img
                    src={imagemPreview}
                    alt="Prévia da peça"
                    style={{
                      width: 150,
                      height: 110,
                      objectFit: 'cover',
                      borderRadius: BORDER_RADIUS.MD,
                      border: `2px solid ${COLORS.BORDEAUX}22`,
                      backgroundColor: COLORS.CREAM,
                    }}
                  />

                  <div style={{ flex: 1, minWidth: 220 }}>
                    <p style={{ margin: 0, color: COLORS.BORDEAUX, fontWeight: 800 }}>
                      Prévia da imagem
                    </p>
                    <p
                      style={{
                        margin: `${SPACING.XS} 0 0`,
                        color: COLORS.MUTED_TEXT,
                        fontSize: '0.86rem',
                      }}
                    >
                      Essa imagem será salva junto com a peça.
                    </p>

                    <button
                      type="button"
                      onClick={removerImagem}
                      style={{
                        marginTop: SPACING.SM,
                        padding: '0.45rem 0.85rem',
                        borderRadius: BORDER_RADIUS.MD,
                        border: 'none',
                        backgroundColor: COLORS.ERROR,
                        color: COLORS.ERROR_DARK,
                        cursor: 'pointer',
                        fontWeight: 700,
                      }}
                    >
                      Remover imagem
                    </button>
                  </div>
                </div>
              )}
            </FormGroup>

            <div style={{ height: SPACING.LG }} />

            <FormGroup label="Dimensões em milímetros" required>
              <div className="form-grid-3">
                <div>
                  <input
                    type="number"
                    name="comprimento_mm"
                    placeholder="Comprimento"
                    min="0"
                    step="1"
                    value={formData.comprimento_mm}
                    onChange={handleInputChange}
                    style={getFieldStyle(errors.comprimento_mm)}
                  />
                  <FieldError message={errors.comprimento_mm} />
                </div>

                <div>
                  <input
                    type="number"
                    name="largura_mm"
                    placeholder="Largura"
                    min="0"
                    step="1"
                    value={formData.largura_mm}
                    onChange={handleInputChange}
                    style={getFieldStyle(errors.largura_mm)}
                  />
                  <FieldError message={errors.largura_mm} />
                </div>

                <div>
                  <input
                    type="number"
                    name="altura_mm"
                    placeholder="Altura"
                    min="0"
                    step="1"
                    value={formData.altura_mm}
                    onChange={handleInputChange}
                    style={getFieldStyle(errors.altura_mm)}
                  />
                  <FieldError message={errors.altura_mm} />
                </div>
              </div>
            </FormGroup>

            <div style={{ height: SPACING.LG }} />

            <FormGroup label="Peso em gramas" required error={errors.peso_gramas}>
              <input
                type="number"
                name="peso_gramas"
                placeholder="Ex: 5000"
                min="0"
                step="1"
                value={formData.peso_gramas}
                onChange={handleInputChange}
                style={getFieldStyle(errors.peso_gramas)}
              />
            </FormGroup>
          </section>

          <section
            style={{
              ...CARD_STYLE,
              padding: SPACING.XL,
              marginBottom: SPACING.LG,
            }}
          >
            <div style={{ marginBottom: SPACING.LG }}>
              <h2
                style={{
                  margin: 0,
                  color: COLORS.BORDEAUX,
                  fontSize: '1.2rem',
                  fontFamily: 'Georgia, serif',
                }}
              >
                Descrição técnica
              </h2>
              <p
                style={{
                  margin: `${SPACING.XS} 0 0`,
                  color: COLORS.MUTED_TEXT,
                  fontSize: '0.9rem',
                }}
              >
                Detalhes que ajudam o comprador a validar a autenticidade da peça.
              </p>
            </div>

            <div style={{ display: 'grid', gap: SPACING.LG }}>
              <FormGroup label="Detalhes de gravação" required error={errors.detalhes_gravacao}>
                <textarea
                  name="detalhes_gravacao"
                  placeholder="Ex: inscrições, códigos, numerações ou marcas de fabricação presentes na peça."
                  value={formData.detalhes_gravacao}
                  onChange={handleInputChange}
                  style={getFieldStyle(errors.detalhes_gravacao, textareaBaseStyle)}
                />
              </FormGroup>

              <FormGroup label="Histórico de procedência" required error={errors.historico_proveniencia}>
                <textarea
                  name="historico_proveniencia"
                  placeholder="Ex: origem da peça, veículo de onde foi retirada, histórico de armazenamento ou restauração."
                  value={formData.historico_proveniencia}
                  onChange={handleInputChange}
                  style={getFieldStyle(errors.historico_proveniencia, textareaBaseStyle)}
                />
              </FormGroup>
            </div>
          </section>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: SPACING.MD,
              flexWrap: 'wrap',
              backgroundColor: '#fff',
              borderRadius: BORDER_RADIUS.LG,
              border: `1px solid ${COLORS.BORDER}`,
              boxShadow: SHADOWS.SM,
              padding: SPACING.LG,
            }}
          >
            <button
              type="button"
              onClick={() => navigate('/buscaPecas')}
              style={BUTTON_SECONDARY_STYLE}
            >
              Voltar ao catálogo
            </button>

            <button
              type="submit"
              disabled={loading || loadingOptions}
              style={{
                ...BUTTON_PRIMARY_STYLE,
                padding: `${SPACING.MD} ${SPACING.XXL}`,
                opacity: loading || loadingOptions ? 0.7 : 1,
                cursor: loading || loadingOptions ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Cadastrando...' : loadingOptions ? 'Carregando opções...' : '✓ Cadastrar Peça'}
            </button>
          </div>
          </form>
        )}
      </main>
    </div>
  );
}
