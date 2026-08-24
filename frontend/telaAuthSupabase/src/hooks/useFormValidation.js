import { useState, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const REGEX = {
  nome_peca: /^[A-Za-zÀ-ÿ0-9\s.,ºª°/()-]{3,150}$/,
  sku: /^[A-Z0-9-]{3,30}$/,
  codigoOpcional: /^[A-Z0-9-]{2,50}$/,
  numeroInteiro: /^\d+$/,
  preco: /^\d+([.,]\d{1,2})?$/,
};

export function useFormValidation() {
  const [errors, setErrors] = useState({});
  const { t } = useLanguage();

  const clearFieldError = useCallback((fieldName) => {
    setErrors((prev) => ({
      ...prev,
      [fieldName]: '',
    }));
  }, [t]);

  const validate = useCallback((formData) => {
    const newErrors = {};

    if (!formData.nome_peca.trim()) {
      newErrors.nome_peca = t('partNameRequired');
    } else if (!REGEX.nome_peca.test(formData.nome_peca.trim())) {
      newErrors.nome_peca = t('partNameInvalid');
    }

    if (!formData.sku.trim()) {
      newErrors.sku = t('skuRequired');
    } else if (!REGEX.sku.test(formData.sku.trim())) {
      newErrors.sku = t('skuInvalid');
    }

    if (!formData.oem_number.trim()) {
      newErrors.oem_number = t('oemRequired');
    } else if (!REGEX.codigoOpcional.test(formData.oem_number.trim())) {
      newErrors.oem_number = t('oemInvalid');
    }

    if (!formData.num_serie.trim()) {
      newErrors.num_serie = t('serialRequired');
    } else if (!REGEX.codigoOpcional.test(formData.num_serie.trim())) {
      newErrors.num_serie = t('serialInvalid');
    }

    if (!formData.categoria_id) {
      newErrors.categoria_id = t('categoryRequired');
    }

    if (!formData.material_id) {
      newErrors.material_id = t('materialRequired');
    }

    if (!formData.preco.trim()) {
      newErrors.preco = t('priceRequired');
    } else if (!REGEX.preco.test(formData.preco.trim())) {
      newErrors.preco = t('priceInvalid');
    } else if (Number(formData.preco.replace(',', '.')) <= 0) {
      newErrors.preco = t('pricePositive');
    }

    if (!formData.estoque_atual.trim()) {
      newErrors.estoque_atual = t('stockRequired');
    } else if (!REGEX.numeroInteiro.test(formData.estoque_atual.trim())) {
      newErrors.estoque_atual = t('stockInteger');
    }

    if (!formData.comprimento_mm.trim()) {
      newErrors.comprimento_mm = t('lengthRequired');
    } else if (!REGEX.numeroInteiro.test(formData.comprimento_mm.trim())) {
      newErrors.comprimento_mm = t('lengthInteger');
    }

    if (!formData.largura_mm.trim()) {
      newErrors.largura_mm = t('widthRequired');
    } else if (!REGEX.numeroInteiro.test(formData.largura_mm.trim())) {
      newErrors.largura_mm = t('widthInteger');
    }

    if (!formData.altura_mm.trim()) {
      newErrors.altura_mm = t('heightRequired');
    } else if (!REGEX.numeroInteiro.test(formData.altura_mm.trim())) {
      newErrors.altura_mm = t('heightInteger');
    }

    if (!formData.peso_gramas.trim()) {
      newErrors.peso_gramas = t('weightRequired');
    } else if (!REGEX.numeroInteiro.test(formData.peso_gramas.trim())) {
      newErrors.peso_gramas = t('weightInteger');
    }

    if (!formData.detalhes_gravacao.trim()) {
      newErrors.detalhes_gravacao = t('engravingRequired');
    }

    if (!formData.historico_proveniencia.trim()) {
      newErrors.historico_proveniencia = t('provenanceRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, []);

  return { errors, setErrors, validate, clearFieldError };
}
