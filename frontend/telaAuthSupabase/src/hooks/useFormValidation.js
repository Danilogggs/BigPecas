import { useState, useCallback } from 'react';

const REGEX = {
  nome_peca: /^[A-Za-zÀ-ÿ0-9\s.,ºª°/()-]{3,150}$/,
  sku: /^[A-Z0-9-]{3,30}$/,
  codigoOpcional: /^[A-Z0-9-]{2,50}$/,
  numeroInteiro: /^\d+$/,
  preco: /^\d+([.,]\d{1,2})?$/,
};

export function useFormValidation() {
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
    } else if (Number(formData.preco.replace(',', '.')) <= 0) {
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
  }, []);

  return { errors, setErrors, validate, clearFieldError };
}
