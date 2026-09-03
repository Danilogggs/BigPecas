const {
  calcularScoreHistorico,
  montarFornecedorPublico,
} = require('../../src/modules/pecas/domain/peca');

describe('recomendacoes de pecas e fornecedores', () => {
  it('usa a quantidade de avaliacoes como score do fornecedor', () => {
    const fornecedor = montarFornecedorPublico(
      { id: 7, nome_loja: 'Clássicos', full_name: 'Ana' },
      [{ id: 1, estoque_atual: 2 }],
      { total: 3, soma: 13 },
    );

    expect(fornecedor.score_recomendacao).toBe(3);
    expect(fornecedor.total_avaliacoes).toBe(3);
    expect(fornecedor.media_avaliacoes).toBe(4.3);
  });

  it('prioriza candidata compatível com categorias recorrentes no histórico', () => {
    const historico = [
      { nome_peca: 'Friso Opala', categoria_id: 1, material_id: 2, condicao: 'NOS', preco: 300 },
      { nome_peca: 'Grade Opala', categoria_id: 1, material_id: 3, condicao: 'USADA', preco: 450 },
    ];
    const relacionada = { nome_peca: 'Friso Caravan', categoria_id: 1, material_id: 2, condicao: 'NOS', preco: 350 };
    const distante = { nome_peca: 'Volante Fusca', categoria_id: 9, material_id: 8, condicao: 'RESTAURADA', preco: 2000 };

    expect(calcularScoreHistorico(historico, relacionada))
      .toBeGreaterThan(calcularScoreHistorico(historico, distante));
  });
});
