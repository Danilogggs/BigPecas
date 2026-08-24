import { useState, useRef, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export function useImageUpload() {
  const { t } = useLanguage();
  const imageInputRef = useRef(null);
  const [imagemPreview, setImagemPreview] = useState('');
  const [imageError, setImageError] = useState('');

  const handleImageChange = useCallback((e, onImageChange) => {
    const file = e.target.files?.[0];

    setImageError('');

    if (!file) {
      onImageChange('');
      setImagemPreview('');
      return;
    }

    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp'];

    if (!tiposPermitidos.includes(file.type)) {
      setImageError(t('Selecione uma imagem nos formatos JPG, PNG ou WEBP.'));
      onImageChange('');
      setImagemPreview('');

      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }

      return;
    }

    const tamanhoMaximoMB = 2;
    const tamanhoMaximoBytes = tamanhoMaximoMB * 1024 * 1024;

    if (file.size > tamanhoMaximoBytes) {
      setImageError(t('A imagem deve ter no máximo {value}MB.', { value: tamanhoMaximoMB }));
      onImageChange('');
      setImagemPreview('');

      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }

      return;
    }

    const reader = new FileReader();

    reader.onloadend = () => {
      const imagemBase64 = reader.result;
      onImageChange(imagemBase64);
      setImagemPreview(imagemBase64);
    };

    reader.readAsDataURL(file);
  }, [t]);

  const removerImagem = useCallback((onImageChange) => {
    onImageChange('');
    setImagemPreview('');
    setImageError('');

    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  }, []);

  return {
    imageInputRef,
    imagemPreview,
    imageError,
    setImagemPreview,
    setImageError,
    handleImageChange,
    removerImagem,
  };
}
