import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { listarMinhasPecas, listarCategorias, listarMateriais, buscarPecaPorId, atualizarPeca } from '../services/pecasService';
import { useFormValidation } from '../hooks/useFormValidation';
import { useImageUpload } from '../hooks/useImageUpload';
import PecasList from '../components/PecasList';
import FormEdicaoPeca from '../components/FormEdicaoPeca';

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

export default function EditarPecas() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [savingPeca, setSavingPeca] = useState(false);
  const [pecas, setPecas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [materiais, setMateriais] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedPecaId, setSelectedPecaId] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [pecasSearchQuery, setPecasSearchQuery] = useState('');

  const { errors, setErrors, validate, clearFieldError } = useFormValidation();
  const { imageInputRef, imagemPreview, setImagemPreview, handleImageChange, removerImagem } = useImageUpload();

  // Carrega dados iniciais
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
      }
    }

    carregarDados();
  }, []);

  // Filtra peças baseado na busca
  const filteredPecas = useMemo(() => {
    return pecas.filter(
      (peca) =>
        peca.nome_peca.toLowerCase().includes(pecasSearchQuery.toLowerCase()) ||
        peca.sku.toLowerCase().includes(pecasSearchQuery.toLowerCase())
    );
  }, [pecas, pecasSearchQuery]);

  const normalizeCode = (value) => value.toUpperCase().replace(/\s/g, '');
  const normalizePrice = (value) => value.replace(',', '.');

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    const newValue = ['sku', 'oem_number', 'num_serie'].includes(name)
      ? normalizeCode(value)
      : value;

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));

    clearFieldError(name);
    setMessage({ type: '', text: '' });
  }, [clearFieldError]);

  const handleSelectPeca = useCallback(
    async (pecaId) => {
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
    },
    [setErrors, setImagemPreview, imageInputRef]
  );

  const handleImageChangeWrapper = useCallback(
    (e) => {
      handleImageChange(e, (imagemBase64) => {
        setFormData((prev) => ({
          ...prev,
          imagem: imagemBase64,
        }));
      });
    },
    [handleImageChange]
  );

  const handleRemoveImage = useCallback(() => {
    removerImagem(() => {
      setFormData((prev) => ({
        ...prev,
        imagem: '',
      }));
    });
  }, [removerImagem]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      setMessage({ type: '', text: '' });

      if (!validate(formData)) {
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
    },
    [formData, selectedPecaId, validate]
  );

  const handleLimpar = useCallback(() => {
    setSelectedPecaId(null);
    setFormData(INITIAL_FORM);
    setImagemPreview('');
    setErrors({});
    setMessage({ type: '', text: '' });
  }, [setErrors, setImagemPreview]);

  if (loading) {
    return (
      <div className="editar-pecas-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <span style={{ color: '#7B1D2E' }}>Carregando suas peças...</span>
      </div>
    );
  }

  return (
    <div className="editar-pecas-container">
      {/* Header */}
      <div className="editar-pecas-header">
        <h1>BigPeças</h1>
        <button onClick={() => navigate('/')}>← Voltar para home</button>
      </div>

      {/* Content */}
      <div className="editar-pecas-content">
        <PecasList
          pecas={pecas}
          filteredPecas={filteredPecas}
          pecasSearchQuery={pecasSearchQuery}
          setPecasSearchQuery={setPecasSearchQuery}
          selectedPecaId={selectedPecaId}
          onSelectPeca={handleSelectPeca}
        />

        {selectedPecaId ? (
          <FormEdicaoPeca
            formData={formData}
            onInputChange={handleInputChange}
            onImageChange={handleImageChangeWrapper}
            onRemoveImage={handleRemoveImage}
            imagemPreview={imagemPreview}
            imageInputRef={imageInputRef}
            categorias={categorias}
            materiais={materiais}
            errors={errors}
            message={message}
            saving={savingPeca}
            onSubmit={handleSubmit}
            onLimpar={handleLimpar}
          />
        ) : (
          <div className="editar-form-container">
            <div className="editar-form-empty">
              <div>
                <div className="editar-form-empty-text">Selecione uma peça para editar</div>
                <div className="editar-form-empty-subtext">
                  Clique em qualquer peça na lista à esquerda para começar
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
