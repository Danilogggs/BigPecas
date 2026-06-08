import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import {
  listarMinhasPecas,
  listarCategorias,
  listarMateriais,
  buscarPecaPorId,
  atualizarPeca,
} from '../services/pecasService';
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

const pageStyles = `
  .editar-pecas-container {
    min-height: 100vh;
    background: #EDE4CC;
    box-sizing: border-box;
    font-family: Arial, Helvetica, sans-serif;
    color: #1A2820;
  }

  .editar-pecas-main {
    padding: 32px 20px;
  }

  .editar-pecas-container * {
    box-sizing: border-box;
  }

  .editar-pecas-header {
    max-width: 1180px;
    margin: 0 auto 24px;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
  }

  .editar-pecas-header h1 {
    margin: 0;
    color: #152218;
    font-size: 34px;
    font-weight: 900;
    letter-spacing: -0.04em;
  }

  .editar-pecas-kicker {
    margin: 0 0 6px;
    color: #6B7D6E;
    font-size: 13px;
    font-weight: 900;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .editar-pecas-subtitle {
    margin: 8px 0 0;
    color: #6B7D6E;
    font-size: 15px;
    max-width: 640px;
    line-height: 1.5;
  }

  .editar-pecas-header button,
  .form-actions button {
    border: 1px solid rgba(21, 34, 24, 0.2);
    border-radius: 9999px;
    padding: 12px 20px;
    background: #fff;
    color: #152218;
    font-weight: 800;
    cursor: pointer;
    transition: 0.2s ease;
  }

  .editar-pecas-header button:hover,
  .form-actions button:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 18px rgba(21, 34, 24, 0.12);
  }

  .editar-pecas-content {
    max-width: 1180px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: minmax(280px, 360px) 1fr;
    gap: 24px;
    align-items: start;
  }

  .pecas-list-container,
  .editar-form-container {
    background: #fff;
    border-radius: 24px;
    padding: 24px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  }

  .editar-form-container {
    padding: 28px;
  }

  .pecas-list-header h2,
  .form-title {
    margin: 0 0 18px;
    color: #152218;
    font-weight: 900;
  }

  .pecas-list-header h2 {
    font-size: 23px;
  }

  .form-title {
    font-size: 26px;
  }

  .pecas-list-header input,
  .form-input,
  .form-select,
  .form-textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 13px 14px;
    border: 1px solid #d1d5db;
    border-radius: 12px;
    background: #fff;
    color: #1f2937;
    font-size: 15px;
    outline: none;
    transition: 0.2s ease;
  }

  .pecas-list-header input:focus,
  .form-input:focus,
  .form-select:focus,
  .form-textarea:focus {
    border-color: #152218;
    box-shadow: 0 0 0 3px rgba(21, 34, 24, 0.12);
  }

  .pecas-list-content {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 16px;
    max-height: 680px;
    overflow-y: auto;
    padding-right: 4px;
  }

  .pecas-list-content::-webkit-scrollbar {
    width: 8px;
  }

  .pecas-list-content::-webkit-scrollbar-thumb {
    background: rgba(21, 34, 24, 0.25);
    border-radius: 999px;
  }

  .pecas-list-empty {
    color: #6B7D6E;
    text-align: center;
    padding: 32px 12px;
  }

  .peca-item {
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    padding: 14px;
    cursor: pointer;
    background: #F5EDD8;
    transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
  }

  .peca-item:hover,
  .peca-item.active {
    border-color: #152218;
    box-shadow: 0 8px 18px rgba(21, 34, 24, 0.12);
    transform: translateY(-1px);
  }

  .peca-item-nome {
    color: #1A2820;
    font-weight: 900;
    margin-bottom: 6px;
    line-height: 1.3;
  }

  .peca-item-sku,
  .peca-item-preco {
    color: #6B7D6E;
    font-size: 14px;
    line-height: 1.5;
  }

  .editar-form {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 16px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .form-label {
    color: #152218;
    font-weight: 800;
    font-size: 14px;
  }

  .form-textarea {
    resize: vertical;
    min-height: 100px;
  }

  .form-input.error,
  .form-select.error,
  .form-textarea.error {
    border-color: #B91C1C;
    box-shadow: 0 0 0 3px rgba(185, 28, 28, 0.1);
  }

  .form-error {
    color: #B91C1C;
    font-size: 0.82rem;
    font-weight: 800;
  }

  .form-message {
    border-radius: 12px;
    padding: 12px 14px;
    font-weight: 800;
    margin-bottom: 16px;
  }

  .form-message.success {
    background: #dcfce7;
    color: #166534;
  }

  .form-message.error {
    background: #fee2e2;
    color: #152218;
  }

  .image-preview {
    max-width: 180px;
    border-radius: 14px;
    border: 1px solid #e5e7eb;
    margin-top: 8px;
  }

  .form-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 8px;
  }

  .form-actions button[type="submit"] {
    border: none;
    background: #C9A84C;
    color: #1A2820;
  }

  .form-actions button:disabled {
    cursor: not-allowed;
    opacity: 0.7;
    transform: none;
    box-shadow: none;
  }

  .editar-form-empty {
    min-height: 360px;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    color: #6B7D6E;
  }

  .editar-form-empty-text {
    color: #152218;
    font-size: 24px;
    font-weight: 900;
    margin-bottom: 8px;
  }

  .editar-form-empty-subtext {
    font-size: 15px;
  }

  .form-wide {
    width: 100%;
  }

  .form-image-preview {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    flex-wrap: wrap;
    margin: 10px 0;
  }

  .form-image-preview img {
    width: 160px;
    height: 120px;
    object-fit: cover;
    border-radius: 14px;
    border: 1px solid #e5e7eb;
  }

  .form-image-remove-btn {
    border: 1px solid rgba(185, 28, 28, 0.2);
    border-radius: 9999px;
    padding: 10px 16px;
    background: #fff;
    color: #B91C1C;
    font-weight: 800;
    cursor: pointer;
  }

  .form-image-help {
    color: #6B7D6E;
    font-size: 13px;
    margin-top: 8px;
  }

  @media (max-width: 860px) {
    .editar-pecas-main {
      padding: 24px 14px;
    }

    .editar-pecas-header {
      align-items: flex-start;
      flex-direction: column;
    }

    .editar-pecas-content {
      grid-template-columns: 1fr;
    }

    .pecas-list-content {
      max-height: 360px;
    }
  }
`;

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
  const {
    imageInputRef,
    imagemPreview,
    setImagemPreview,
    handleImageChange,
    removerImagem,
  } = useImageUpload();

  useEffect(() => {
    async function carregarDados() {
      try {
        const [pecasData, categoriasData, materiaisData] = await Promise.all([
          listarMinhasPecas(),
          listarCategorias(),
          listarMateriais(),
        ]);

        const minhasPecas = Array.isArray(pecasData?.data)
          ? pecasData.data
          : Array.isArray(pecasData)
            ? pecasData
            : [];

        setPecas(minhasPecas);
        setCategorias(Array.isArray(categoriasData) ? categoriasData : []);
        setMateriais(Array.isArray(materiaisData) ? materiaisData : []);
      } catch (error) {
        setMessage({
          type: 'error',
          text: error?.message || 'Não foi possível carregar suas peças e opções.',
        });
      } finally {
        setLoading(false);
      }
    }

    carregarDados();
  }, []);

  const filteredPecas = useMemo(() => {
    return pecas.filter((peca) => {
      const nome = peca?.nome_peca || '';
      const sku = peca?.sku || '';
      const busca = pecasSearchQuery.toLowerCase();

      return (
        nome.toLowerCase().includes(busca) ||
        sku.toLowerCase().includes(busca)
      );
    });
  }, [pecas, pecasSearchQuery]);

  const normalizeCode = (value) => value.toUpperCase().replace(/\s/g, '');
  const normalizePrice = (value) => value.replace(',', '.');

  const handleInputChange = useCallback(
    (e) => {
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
    },
    [clearFieldError]
  );

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
        setMessage({
          type: 'error',
          text: 'Corrija os campos destacados antes de salvar.',
        });
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
        peso_gramas: formData.peso_gramas
          ? parseInt(formData.peso_gramas, 10)
          : null,
        comprimento_mm: formData.comprimento_mm
          ? parseInt(formData.comprimento_mm, 10)
          : null,
        largura_mm: formData.largura_mm
          ? parseInt(formData.largura_mm, 10)
          : null,
        altura_mm: formData.altura_mm
          ? parseInt(formData.altura_mm, 10)
          : null,
        detalhes_gravacao: formData.detalhes_gravacao.trim(),
        historico_proveniencia: formData.historico_proveniencia.trim(),
        preco: normalizePrice(formData.preco.trim()),
        estoque_atual: formData.estoque_atual
          ? parseInt(formData.estoque_atual, 10)
          : 0,
        imagem: formData.imagem || '',
      };

      try {
        const response = await atualizarPeca(selectedPecaId, payload);

        setMessage({
          type: 'success',
          text: response.message || 'Peça atualizada com sucesso!',
        });

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
      <>
        <style>{pageStyles}</style>

        <div
          className="editar-pecas-container"
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <span style={{ color: '#152218', fontWeight: 800 }}>
            Carregando suas peças...
          </span>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{pageStyles}</style>

      <div className="editar-pecas-container">
        <Header />

        <main className="editar-pecas-main">
          <div className="editar-pecas-header">
            <div>
              <p className="editar-pecas-kicker">Área do vendedor</p>
              <h1>Editar minhas peças</h1>
              <p className="editar-pecas-subtitle">Selecione uma peça cadastrada para revisar informações, estoque, preço e imagem.</p>
            </div>
            <button type="button" onClick={() => navigate('/cadastroPecas')}>
              + Cadastrar nova peça
            </button>
          </div>

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
                  <div className="editar-form-empty-text">
                    Selecione uma peça para editar
                  </div>
                  <div className="editar-form-empty-subtext">
                    Clique em qualquer peça na lista à esquerda para começar
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
        </main>
      </div>
    </>
  );
}