import {
  buscarNomeOpcao,
  filtrarPecasPorTexto,
  normalizarCodigoPeca,
  normalizarPrecoPeca,
  precoParaSlider,
  sliderParaPreco,
} from '../peca';

describe('domínio de peças', () => {
  it('normaliza códigos e preço antes do envio', () => {
    expect(normalizarCodigoPeca(' gm 12-a ')).toBe('GM12-A');
    expect(normalizarPrecoPeca('349,90')).toBe('349.90');
  });

  it('localiza nomes do catálogo comparando ids como texto', () => {
    expect(buscarNomeOpcao([{ id: 2, nome: 'Motor' }], '2', 'Desconhecida')).toBe('Motor');
    expect(buscarNomeOpcao([], 2, 'Desconhecida')).toBe('Desconhecida');
  });

  it('filtra peças por nome ou SKU sem diferenciar maiúsculas', () => {
    const pecas = [
      { id: 1, nome_peca: 'Friso Opala', sku: 'FR-01' },
      { id: 2, nome_peca: 'Lanterna', sku: 'LT-99' },
    ];

    expect(filtrarPecasPorTexto(pecas, 'opala').map((peca) => peca.id)).toEqual([1]);
    expect(filtrarPecasPorTexto(pecas, 'lt-99').map((peca) => peca.id)).toEqual([2]);
  });

  it('mantém a conversão não linear do filtro de preço reversível', () => {
    expect(sliderParaPreco(precoParaSlider(750))).toBe(750);
    expect(sliderParaPreco(precoParaSlider(25000))).toBe(25000);
    expect(sliderParaPreco(precoParaSlider(50000))).toBe(50000);
  });
});
