import { memo } from 'react';
import { FormInput, FormSelect, FormTextarea } from './FormComponents';

const FormEdicaoPeca = memo(function FormEdicaoPeca({
  formData,
  onInputChange,
  onImageChange,
  onRemoveImage,
  imagemPreview,
  imageInputRef,
  categorias,
  materiais,
  errors,
  message,
  saving,
  onSubmit,
  onLimpar,
}) {
  const conditions = [
    { id: 'NOS', label: 'NOS (Novo em Estoque)' },
    { id: 'USED', label: 'USED (Usado)' },
    { id: 'REFURBISHED', label: 'REFURBISHED (Refabricado)' },
  ];

  return (
    <div className="editar-form-container">
      <h2 className="form-title">Editar Peça</h2>

      {message.text && (
        <div className={`form-message ${message.type}`}>{message.text}</div>
      )}

      <form onSubmit={onSubmit} noValidate className="editar-form">
        <div className="form-grid">
          <FormInput
            name="nome_peca"
            label="Nome da Peça"
            value={formData.nome_peca}
            onChange={onInputChange}
            error={errors.nome_peca}
            required
          />

          <FormInput
            name="sku"
            label="SKU"
            value={formData.sku}
            onChange={onInputChange}
            error={errors.sku}
            required
          />

          <FormInput
            name="oem_number"
            label="Número OEM"
            value={formData.oem_number}
            onChange={onInputChange}
            error={errors.oem_number}
            required
          />

          <FormInput
            name="num_serie"
            label="Número de Série"
            value={formData.num_serie}
            onChange={onInputChange}
            error={errors.num_serie}
            required
          />

          <FormSelect
            name="categoria_id"
            label="Categoria"
            value={formData.categoria_id}
            onChange={onInputChange}
            error={errors.categoria_id}
            options={categorias}
            placeholder="Selecione uma categoria"
            required
          />

          <FormSelect
            name="material_id"
            label="Material"
            value={formData.material_id}
            onChange={onInputChange}
            error={errors.material_id}
            options={materiais}
            placeholder="Selecione um material"
            required
          />

          <FormSelect
            name="condicao"
            label="Condição"
            value={formData.condicao}
            onChange={onInputChange}
            options={conditions}
            placeholder="Selecione a condição"
          />

          <FormInput
            name="preco"
            label="Preço (R$)"
            value={formData.preco}
            onChange={onInputChange}
            error={errors.preco}
            placeholder="0.00"
            required
          />

          <FormInput
            name="estoque_atual"
            type="number"
            label="Estoque Atual"
            value={formData.estoque_atual}
            onChange={onInputChange}
            error={errors.estoque_atual}
            required
          />

          <FormInput
            name="peso_gramas"
            type="number"
            label="Peso (gramas)"
            value={formData.peso_gramas}
            onChange={onInputChange}
            error={errors.peso_gramas}
            required
          />

          <FormInput
            name="comprimento_mm"
            type="number"
            label="Comprimento (mm)"
            value={formData.comprimento_mm}
            onChange={onInputChange}
            error={errors.comprimento_mm}
            required
          />

          <FormInput
            name="largura_mm"
            type="number"
            label="Largura (mm)"
            value={formData.largura_mm}
            onChange={onInputChange}
            error={errors.largura_mm}
            required
          />

          <FormInput
            name="altura_mm"
            type="number"
            label="Altura (mm)"
            value={formData.altura_mm}
            onChange={onInputChange}
            error={errors.altura_mm}
            required
          />
        </div>

        <div className="form-wide">
          <FormTextarea
            name="detalhes_gravacao"
            label="Detalhes de Gravação"
            value={formData.detalhes_gravacao}
            onChange={onInputChange}
            error={errors.detalhes_gravacao}
            rows={3}
            required
          />
        </div>

        <div className="form-wide">
          <FormTextarea
            name="historico_proveniencia"
            label="Histórico de Procedência"
            value={formData.historico_proveniencia}
            onChange={onInputChange}
            error={errors.historico_proveniencia}
            rows={3}
            required
          />
        </div>

        <div className="form-wide">
          <div className="form-label">Imagem da Peça</div>
          {imagemPreview && (
            <div className="form-image-preview">
              <img src={imagemPreview} alt="Preview" />
              <button
                type="button"
                onClick={onRemoveImage}
                className="form-image-remove-btn"
              >
                Remover imagem
              </button>
            </div>
          )}
          <input
            type="file"
            ref={imageInputRef}
            onChange={onImageChange}
            accept="image/jpeg,image/png,image/webp"
            className="form-input"
          />
          <div className="form-image-help">
            Formatos aceitos: JPG, PNG, WEBP (máx. 2MB)
          </div>
        </div>

        <div className="form-actions">
          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary"
          >
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>

          <button
            type="button"
            onClick={onLimpar}
            className="btn btn-secondary"
          >
            Limpar formulário
          </button>
        </div>
      </form>
    </div>
  );
});

export default FormEdicaoPeca;
