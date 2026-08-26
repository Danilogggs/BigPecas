import { useState, useCallback } from 'react';

const REGEX = {
  nome_peca: /^[A-Za-zÀ-ÿ0-9\s.,ºª°/()-]{3,150}$/,
  sku: /^[A-Z0-9-]{3,30}$/,
  codigoOpcional: /^[A-Z0-9-]{2,50}$/,
  numeroInteiro: /^\d+$/,
  preco: /^\d+([.,]\d{1,2})?$/,
};

const MENSAGENS_PADRAO = Object.freeze({
  partNameRequired: 'Informe o nome da peça.',
  partNameInvalid: 'O nome da peça deve ter pelo menos 3 caracteres válidos.',
  skuRequired: 'Informe o SKU da peça.',
  skuInvalid: 'SKU inválido. Use letras maiúsculas, números e hífen.',
  oemRequired: 'Informe o número OEM.',
  oemInvalid: 'Número OEM inválido.',
  serialRequired: 'Informe o número de série.',
  serialInvalid: 'Número de série inválido.',
  categoryRequired: 'Selecione a categoria da peça.',
  materialRequired: 'Selecione o material da peça.',
  priceRequired: 'Informe o preço da peça.',
  priceInvalid: 'Preço inválido.',
  pricePositive: 'O preço deve ser maior que zero.',
  stockRequired: 'Informe o estoque atual.',
  stockInteger: 'O estoque deve ser um número inteiro.',
  lengthRequired: 'Informe o comprimento.',
  lengthInteger: 'O comprimento deve ser um número inteiro.',
  widthRequired: 'Informe a largura.',
  widthInteger: 'A largura deve ser um número inteiro.',
  heightRequired: 'Informe a altura.',
  heightInteger: 'A altura deve ser um número inteiro.',
  weightRequired: 'Informe o peso da peça.',
  weightInteger: 'O peso deve ser informado apenas em números inteiros.',
  engravingRequired: 'Informe os detalhes de gravação.',
  provenanceRequired: 'Informe o histórico de procedência.',
});

const traduzirPadrao = (chave) => MENSAGENS_PADRAO[chave] || chave;

export function useFormValidation(traduzir = traduzirPadrao) {
  const [errors, setErrors] = useState({});

  const clearFieldError = useCallback((fieldName) => {
    setErrors((prev) => ({
      ...prev,
      [fieldName]: '',
    }));
  }, []);

  const validate = useCallback((formData) => {
    const newErrors = {};

    if (!formData.nome_peca.trim()) {
      newErrors.nome_peca = traduzir('partNameRequired');
    } else if (!REGEX.nome_peca.test(formData.nome_peca.trim())) {
      newErrors.nome_peca = traduzir('partNameInvalid');
    }

    if (!formData.sku.trim()) {
      newErrors.sku = traduzir('skuRequired');
    } else if (!REGEX.sku.test(formData.sku.trim())) {
      newErrors.sku = traduzir('skuInvalid');
    }

    if (!formData.oem_number.trim()) {
      newErrors.oem_number = traduzir('oemRequired');
    } else if (!REGEX.codigoOpcional.test(formData.oem_number.trim())) {
      newErrors.oem_number = traduzir('oemInvalid');
    }

    if (!formData.num_serie.trim()) {
      newErrors.num_serie = traduzir('serialRequired');
    } else if (!REGEX.codigoOpcional.test(formData.num_serie.trim())) {
      newErrors.num_serie = traduzir('serialInvalid');
    }

    if (!formData.categoria_id) {
      newErrors.categoria_id = traduzir('categoryRequired');
    }

    if (!formData.material_id) {
      newErrors.material_id = traduzir('materialRequired');
    }

    if (!formData.preco.trim()) {
      newErrors.preco = traduzir('priceRequired');
    } else if (!REGEX.preco.test(formData.preco.trim())) {
      newErrors.preco = traduzir('priceInvalid');
    } else if (Number(formData.preco.replace(',', '.')) <= 0) {
      newErrors.preco = traduzir('pricePositive');
    }

    if (!formData.estoque_atual.trim()) {
      newErrors.estoque_atual = traduzir('stockRequired');
    } else if (!REGEX.numeroInteiro.test(formData.estoque_atual.trim())) {
      newErrors.estoque_atual = traduzir('stockInteger');
    }

    if (!formData.comprimento_mm.trim()) {
      newErrors.comprimento_mm = traduzir('lengthRequired');
    } else if (!REGEX.numeroInteiro.test(formData.comprimento_mm.trim())) {
      newErrors.comprimento_mm = traduzir('lengthInteger');
    }

    if (!formData.largura_mm.trim()) {
      newErrors.largura_mm = traduzir('widthRequired');
    } else if (!REGEX.numeroInteiro.test(formData.largura_mm.trim())) {
      newErrors.largura_mm = traduzir('widthInteger');
    }

    if (!formData.altura_mm.trim()) {
      newErrors.altura_mm = traduzir('heightRequired');
    } else if (!REGEX.numeroInteiro.test(formData.altura_mm.trim())) {
      newErrors.altura_mm = traduzir('heightInteger');
    }

    if (!formData.peso_gramas.trim()) {
      newErrors.peso_gramas = traduzir('weightRequired');
    } else if (!REGEX.numeroInteiro.test(formData.peso_gramas.trim())) {
      newErrors.peso_gramas = traduzir('weightInteger');
    }

    if (!formData.detalhes_gravacao.trim()) {
      newErrors.detalhes_gravacao = traduzir('engravingRequired');
    }

    if (!formData.historico_proveniencia.trim()) {
      newErrors.historico_proveniencia = traduzir('provenanceRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [traduzir]);

  return { errors, setErrors, validate, clearFieldError };
}
