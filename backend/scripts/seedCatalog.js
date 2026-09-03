require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const apply = process.argv.includes('--apply');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const catalogo = [
  ['BP-SEED-MOT-001', 'Carburador Solex 40 para Opala', 'Motor', 'Alumínio', 'Restaurada', 1890, 4, 'GM-94629114'],
  ['BP-SEED-MOT-002', 'Tampa de válvulas Chevrolet 6 cilindros', 'Motor', 'Alumínio', 'NOS', 780, 6, 'GM-7325147'],
  ['BP-SEED-MOT-003', 'Coletor de admissão Opala 4 cilindros', 'Motor', 'Alumínio', 'Usada', 1250, 3, 'GM-9299928'],
  ['BP-SEED-MOT-004', 'Jogo de juntas do motor AP 1.8', 'Motor', 'Borracha', 'NOS', 349.9, 12, 'VW-026198012'],
  ['BP-SEED-LAT-001', 'Grade dianteira Chevrolet Caravan 1978', 'Lataria', 'Aço', 'Restaurada', 1640, 2, 'GM-94607055'],
  ['BP-SEED-LAT-002', 'Paralama dianteiro direito Fusca', 'Lataria', 'Aço', 'Novo', 899.9, 5, 'VW-113821022'],
  ['BP-SEED-LAT-003', 'Emblema Ford Corcel GT', 'Lataria', 'Cromo', 'NOS', 289.9, 8, 'FORD-BE2D16098'],
  ['BP-SEED-ELE-001', 'Alternador Bosch 55A para Chevette', 'Elétrica', 'Alumínio', 'Restaurada', 690, 4, 'BOSCH-9120080184'],
  ['BP-SEED-ELE-002', 'Par de faróis Cibié para Gol quadrado', 'Elétrica', 'Aço', 'NOS', 1180, 3, 'CIBIE-084676'],
  ['BP-SEED-ELE-003', 'Chave de seta original Monza', 'Elétrica', 'Baquelite', 'Usada', 420, 5, 'GM-94643827'],
  ['BP-SEED-INT-001', 'Volante cálice Opala SS', 'Interior', 'Baquelite', 'Restaurada', 1490, 2, 'GM-9297778'],
  ['BP-SEED-INT-002', 'Manopla de câmbio Fusca 4 marchas', 'Interior', 'Baquelite', 'NOS', 119.9, 15, 'VW-113711141'],
  ['BP-SEED-INT-003', 'Jogo de tapetes de borracha Chevette', 'Interior', 'Borracha', 'Novo', 259.9, 10, 'GM-94620017'],
  ['BP-SEED-SUS-001', 'Par de amortecedores dianteiros Opala', 'Suspensão', 'Aço', 'Novo', 860, 7, 'COFAP-B47408'],
  ['BP-SEED-SUS-002', 'Kit buchas da suspensão Brasília', 'Suspensão', 'Borracha', 'Novo', 239.9, 11, 'VW-102498'],
  ['BP-SEED-FRE-001', 'Par de discos de freio Maverick V8', 'Freios', 'Aço', 'Novo', 1120, 4, 'FORD-BF2A1125'],
  ['BP-SEED-FRE-002', 'Cilindro mestre de freio Dodge Dart', 'Freios', 'Aço', 'NOS', 749.9, 3, 'MOPAR-2808600'],
  ['BP-SEED-FRE-003', 'Jogo de pastilhas de freio Del Rey', 'Freios', 'Antimônio', 'Novo', 189.9, 14, 'FORD-BE8Z2001'],
];

const imagemPorSku = new Map(
  catalogo.map(([sku]) => [sku, `/catalogo-seed/${sku}.png`]),
);

const especificacoesPorSku = new Map([
  ['BP-SEED-MOT-001', { num_serie: 'SLX40-OP-18472', comprimento_mm: 210, largura_mm: 185, altura_mm: 160, peso_gramas: 4200, detalhes_gravacao: 'Corpo gravado SOLEX 40 e código de fundição 40-DEIS.' }],
  ['BP-SEED-MOT-002', { num_serie: 'TV6C-7325147', comprimento_mm: 690, largura_mm: 230, altura_mm: 120, peso_gramas: 3100, detalhes_gravacao: 'Logotipo Chevrolet e referência GM 7325147 em alto-relevo.' }],
  ['BP-SEED-MOT-003', { num_serie: 'CIA4-9299928', comprimento_mm: 520, largura_mm: 245, altura_mm: 210, peso_gramas: 6800, detalhes_gravacao: 'Número de fundição GM 9299928 preservado no corpo.' }],
  ['BP-SEED-MOT-004', { num_serie: 'JAP18-026198012', comprimento_mm: 480, largura_mm: 320, altura_mm: 45, peso_gramas: 1250, detalhes_gravacao: 'Juntas identificadas por aplicação e referência VW 026198012.' }],
  ['BP-SEED-LAT-001', { num_serie: 'GDC78-94607055', comprimento_mm: 1320, largura_mm: 390, altura_mm: 95, peso_gramas: 7200, detalhes_gravacao: 'Estampo GM 94607055 na travessa interna.' }],
  ['BP-SEED-LAT-002', { num_serie: 'PDF-113821022', comprimento_mm: 1240, largura_mm: 620, altura_mm: 310, peso_gramas: 8900, detalhes_gravacao: 'Referência VW 113821022 estampada na aba de fixação.' }],
  ['BP-SEED-LAT-003', { num_serie: 'ECGT-BE2D16098', comprimento_mm: 235, largura_mm: 52, altura_mm: 18, peso_gramas: 210, detalhes_gravacao: 'Inscrições FORD e CORCEL GT moldadas no verso.' }],
  ['BP-SEED-ELE-001', { num_serie: 'ALT55-9120080184', comprimento_mm: 205, largura_mm: 175, altura_mm: 180, peso_gramas: 5100, detalhes_gravacao: 'Plaqueta Bosch 55A com referência 9 120 080 184.' }],
  ['BP-SEED-ELE-002', { num_serie: 'CIB-084676-PAR', comprimento_mm: 420, largura_mm: 240, altura_mm: 190, peso_gramas: 3600, detalhes_gravacao: 'Marca Cibié e homologação gravadas nas lentes.' }],
  ['BP-SEED-ELE-003', { num_serie: 'CSET-94643827', comprimento_mm: 265, largura_mm: 110, altura_mm: 95, peso_gramas: 680, detalhes_gravacao: 'Referência GM 94643827 moldada na carcaça.' }],
  ['BP-SEED-INT-001', { num_serie: 'VCSS-9297778', comprimento_mm: 390, largura_mm: 390, altura_mm: 105, peso_gramas: 2850, detalhes_gravacao: 'Símbolo GM e código 9297778 no cubo traseiro.' }],
  ['BP-SEED-INT-002', { num_serie: 'MCF4-113711141', comprimento_mm: 48, largura_mm: 48, altura_mm: 72, peso_gramas: 115, detalhes_gravacao: 'Diagrama original das quatro marchas gravado no topo.' }],
  ['BP-SEED-INT-003', { num_serie: 'TBC-94620017', comprimento_mm: 720, largura_mm: 510, altura_mm: 28, peso_gramas: 4600, detalhes_gravacao: 'Referência GM e indicação de posição moldadas no verso.' }],
  ['BP-SEED-SUS-001', { num_serie: 'COF-B47408-PAR', comprimento_mm: 610, largura_mm: 165, altura_mm: 165, peso_gramas: 7900, detalhes_gravacao: 'COFAP B47408 e lote gravados nos tubos.' }],
  ['BP-SEED-SUS-002', { num_serie: 'KBS-102498', comprimento_mm: 310, largura_mm: 220, altura_mm: 85, peso_gramas: 1450, detalhes_gravacao: 'Códigos de aplicação moldados individualmente nas buchas.' }],
  ['BP-SEED-FRE-001', { num_serie: 'DFM-BF2A1125', comprimento_mm: 315, largura_mm: 315, altura_mm: 115, peso_gramas: 14200, detalhes_gravacao: 'Referência BF2A-1125 e espessura mínima gravadas nos discos.' }],
  ['BP-SEED-FRE-002', { num_serie: 'CMDD-2808600', comprimento_mm: 245, largura_mm: 105, altura_mm: 115, peso_gramas: 2350, detalhes_gravacao: 'Código Mopar 2808600 fundido no cilindro.' }],
  ['BP-SEED-FRE-003', { num_serie: 'PFD-BE8Z2001', comprimento_mm: 170, largura_mm: 125, altura_mm: 80, peso_gramas: 1320, detalhes_gravacao: 'Código BE8Z-2001 e indicação de lote impressos nas pastilhas.' }],
]);

async function main() {
  const [{ data: categorias, error: categoriasError }, { data: materiais, error: materiaisError }, { data: fornecedores, error: fornecedoresError }] = await Promise.all([
    supabase.from('categorias').select('id, nome'),
    supabase.from('materiais').select('id, nome'),
    supabase.from('users').select('id, nome_loja, full_name').not('nome_loja', 'is', null),
  ]);
  if (categoriasError) throw categoriasError;
  if (materiaisError) throw materiaisError;
  if (fornecedoresError) throw fornecedoresError;
  if (!fornecedores?.length) throw new Error('Nenhum perfil de vendedor com loja configurada foi encontrado.');

  const categoriaPorNome = new Map(categorias.map((item) => [item.nome, item.id]));
  const materiaisNecessarios = [...new Set(catalogo.map((item) => item[3]))];
  const materiaisAusentes = materiaisNecessarios.filter((nome) => !materiais.some((item) => item.nome === nome));
  let materiaisCompletos = materiais;
  if (materiaisAusentes.length) {
    if (!apply) {
      console.log(JSON.stringify({ modo: 'simulacao', materiais_a_criar: materiaisAusentes, pecas_a_verificar: catalogo.length, fornecedores: fornecedores.length }, null, 2));
      return;
    }
    const { data: criados, error: materiaisInsertError } = await supabase
      .from('materiais').insert(materiaisAusentes.map((nome) => ({ nome }))).select('id, nome');
    if (materiaisInsertError) throw materiaisInsertError;
    materiaisCompletos = [...materiais, ...(criados || [])];
  }
  const materialPorNome = new Map(materiaisCompletos.map((item) => [item.nome, item.id]));
  const skus = catalogo.map(([sku]) => sku);
  const { data: existentes, error: existentesError } = await supabase.from('pecas').select('id, sku, imagem, num_serie, comprimento_mm, largura_mm, altura_mm, peso_gramas, detalhes_gravacao').in('sku', skus);
  if (existentesError) throw existentesError;
  const existentesSet = new Set((existentes || []).map((item) => item.sku));

  const registros = catalogo.filter(([sku]) => !existentesSet.has(sku)).map((item, index) => {
    const [sku, nome_peca, categoria, material, condicao, preco, estoque_atual, oem_number] = item;
    const categoria_id = categoriaPorNome.get(categoria);
    const material_id = materialPorNome.get(material);
    if (!categoria_id || !material_id) throw new Error(`Categoria ou material ausente para ${sku}. Disponíveis: categorias [${[...categoriaPorNome.keys()].join(', ')}]; materiais [${[...materialPorNome.keys()].join(', ')}].`);
    return {
      sku, nome_peca, categoria_id, material_id, condicao, preco, preco_base: preco,
      moeda_base: 'BRL', estoque_atual, oem_number,
      fornecedor_id: fornecedores[index % fornecedores.length].id,
      status: 'disponivel', status_publicacao: 'publicada',
      imagem: imagemPorSku.get(sku),
      ...especificacoesPorSku.get(sku),
      historico_proveniencia: 'Item de demonstração do catálogo BigPeças. Consulte o vendedor para confirmar procedência e aplicação.',
    };
  });

  const imagensDesatualizadas = (existentes || []).filter(
    (item) => item.imagem !== imagemPorSku.get(item.sku),
  );
  const especificacoesDesatualizadas = (existentes || []).filter((item) => {
    const esperadas = especificacoesPorSku.get(item.sku);
    return Object.entries(esperadas).some(([campo, valor]) => item[campo] !== valor);
  });
  console.log(JSON.stringify({ modo: apply ? 'aplicar' : 'simulacao', existentes: existentesSet.size, novos: registros.length, imagens_a_corrigir: imagensDesatualizadas.length, especificacoes_a_corrigir: especificacoesDesatualizadas.length, fornecedores: fornecedores.length }, null, 2));
  if (!apply) return;
  if (registros.length) {
    const { data, error } = await supabase.from('pecas').insert(registros).select('id, sku, nome_peca');
    if (error) throw error;
    console.log(`Catálogo populado com ${data.length} peças.`);
  }
  if (imagensDesatualizadas.length) {
    await Promise.all(imagensDesatualizadas.map(async (item) => {
      const imagem = imagemPorSku.get(item.sku);
      const { error } = await supabase.from('pecas').update({ imagem }).eq('id', item.id);
      if (error) throw error;
    }));
    console.log(`Imagens associadas a ${imagensDesatualizadas.length} peças.`);
  }
  if (especificacoesDesatualizadas.length) {
    await Promise.all(especificacoesDesatualizadas.map(async (item) => {
      const { error } = await supabase.from('pecas').update(especificacoesPorSku.get(item.sku)).eq('id', item.id);
      if (error) throw error;
    }));
    console.log(`Especificações técnicas associadas a ${especificacoesDesatualizadas.length} peças.`);
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
