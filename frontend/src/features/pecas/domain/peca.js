export const FORMULARIO_PECA_INICIAL = Object.freeze({
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
  url_video: '',
  moeda_base: 'BRL',
});

export const REGRAS_VALIDACAO_PECA = Object.freeze({
  nome_peca: /^[A-Za-zÀ-ÿ0-9\s.,ºª°/()-]{3,150}$/,
  sku: /^[A-Z0-9-]{3,30}$/,
  codigoOpcional: /^[A-Z0-9-]{2,50}$/,
  numeroInteiro: /^\d+$/,
  preco: /^\d+([.,]\d{1,2})?$/,
  loja: /^[A-Za-zÀ-ÿ0-9\s.'-]{3,150}$/,
});

export const PRECO_MAXIMO_FILTRO = 50000;
export const SLIDER_MAXIMO_PRECO = 2000;

export function normalizarCodigoPeca(valor = '') {
  return valor.toUpperCase().replace(/\s/g, '');
}

export function normalizarPrecoPeca(valor = '') {
  return valor.replace(',', '.');
}

export function buscarNomeOpcao(lista, id, fallback) {
  const item = lista.find((opcao) => String(opcao.id) === String(id));
  return item?.nome || fallback;
}

export function filtrarPecasPorTexto(pecas, busca) {
  const termo = String(busca || '').toLowerCase();
  return pecas.filter((peca) =>
    String(peca?.nome_peca || '').toLowerCase().includes(termo) ||
    String(peca?.sku || '').toLowerCase().includes(termo),
  );
}

export function precoParaSlider(preco) {
  if (preco <= 1000) return preco;
  return 1000 + ((preco - 1000) / (PRECO_MAXIMO_FILTRO - 1000)) * 1000;
}

export function sliderParaPreco(slider) {
  if (slider <= 1000) return slider;
  return Math.round(
    1000 + ((slider - 1000) / 1000) * (PRECO_MAXIMO_FILTRO - 1000),
  );
}
