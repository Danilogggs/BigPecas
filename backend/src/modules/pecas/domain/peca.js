const AppError = require('../../../utils/AppError');

const CAMPOS_ORDENACAO = Object.freeze({
  id: 'id',
  preco: 'preco',
  data: 'data_cadastro',
  data_cadastro: 'data_cadastro',
  created_at: 'created_at',
  estoque: 'estoque_atual',
  estoque_atual: 'estoque_atual',
  nome: 'nome_peca',
  nome_peca: 'nome_peca',
});

const CAMPOS_ATUALIZAVEIS = new Set([
  'nome_peca', 'sku', 'oem_number', 'num_serie', 'categoria_id', 'material_id',
  'condicao', 'peso_gramas', 'comprimento_mm', 'largura_mm', 'altura_mm',
  'detalhes_gravacao', 'historico_proveniencia', 'preco', 'estoque_atual', 'imagem',
]);

const CAMPOS_INTEIROS = new Set([
  'categoria_id', 'material_id', 'peso_gramas', 'comprimento_mm', 'largura_mm',
  'altura_mm', 'estoque_atual',
]);

function validarId(id) {
  if (!/^\d+$/.test(String(id)) || Number(id) < 1) {
    throw new AppError(400, 'Informe um identificador válido.');
  }
  return Number(id);
}

function validarOrdenacao(sort) {
  if (!sort) return 'id';
  const campo = CAMPOS_ORDENACAO[sort];
  if (!campo) throw new AppError(400, 'O campo de ordenação informado é inválido.');
  return campo;
}

function validarNumeroConsulta(valor, nomeCampo) {
  if (valor === undefined || valor === null || valor === '') return null;
  const numero = Number(valor);
  if (Number.isNaN(numero)) {
    throw new AppError(400, `Informe um valor válido para ${nomeCampo}.`);
  }
  return numero;
}

function processarValor(valor) {
  if (valor === '' || valor === null || valor === undefined) return null;
  return typeof valor === 'string' ? valor.trim() : valor;
}

function processarNumero(valor) {
  if (valor === '' || valor === null || valor === undefined) return null;
  const numero = parseInt(valor, 10);
  return Number.isNaN(numero) ? null : numero;
}

function processarFloat(valor) {
  if (valor === '' || valor === null || valor === undefined) return null;
  const numero = parseFloat(String(valor).replace(',', '.'));
  return Number.isNaN(numero) ? null : numero;
}

function obterEmailUsuarioAutenticado(identidade) {
  return identidade?.email || identidade?.user?.email || identidade?.authUser?.email ||
    identidade?.usuario?.email || null;
}

function normalizarTexto(valor) {
  return String(valor || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function calcularSimilaridadePeca(pecaBase, candidata) {
  let score = 0;
  if (pecaBase.categoria_id && pecaBase.categoria_id === candidata.categoria_id) score += 40;
  if (pecaBase.material_id && pecaBase.material_id === candidata.material_id) score += 20;
  if (pecaBase.condicao && pecaBase.condicao === candidata.condicao) score += 15;
  if (pecaBase.fornecedor_id && pecaBase.fornecedor_id === candidata.fornecedor_id) score += 10;

  const precoBase = Number(pecaBase.preco);
  const precoCandidata = Number(candidata.preco);
  if (!Number.isNaN(precoBase) && !Number.isNaN(precoCandidata) && precoBase > 0) {
    const diferenca = Math.abs(precoBase - precoCandidata) / precoBase;
    if (diferenca <= 0.2) score += 15;
    else if (diferenca <= 0.5) score += 8;
  }

  const nomeCandidata = normalizarTexto(candidata.nome_peca);
  const possuiPalavraRelacionada = normalizarTexto(pecaBase.nome_peca)
    .split(' ')
    .filter((palavra) => palavra.length >= 4)
    .some((palavra) => nomeCandidata.includes(palavra));
  if (possuiPalavraRelacionada) score += 10;
  return score;
}

function calcularScoreFornecedor(fornecedor, pecas = []) {
  const pecasComEstoque = pecas.filter((peca) => Number(peca.estoque_atual) > 0);
  let score = pecas.length * 10 + pecasComEstoque.length * 5;
  if (fornecedor.nome_loja) score += 15;
  if (fornecedor.descricao_loja) score += 10;
  if (fornecedor.telefone) score += 5;
  if (fornecedor.email_verificado === true) score += 10;
  return score;
}

function montarFornecedorPublico(fornecedor, pecas = []) {
  const pecasComEstoque = pecas.filter((peca) => Number(peca.estoque_atual) > 0);
  return {
    id: fornecedor.id,
    full_name: fornecedor.full_name,
    nome_loja: fornecedor.nome_loja,
    descricao_loja: fornecedor.descricao_loja,
    email: fornecedor.email,
    telefone: fornecedor.telefone,
    tipo_usuario: 'ambos',
    email_verificado: fornecedor.email_verificado,
    total_pecas: pecas.length,
    pecas_com_estoque: pecasComEstoque.length,
    score_recomendacao: calcularScoreFornecedor(fornecedor, pecas),
  };
}

function usuarioPodeCadastrarPeca(usuario) {
  return Boolean(
    usuario?.id && processarValor(usuario.nome_loja) && processarValor(usuario.descricao_loja),
  );
}

function emailFoiConfirmado(usuarioAutenticado) {
  return Boolean(usuarioAutenticado?.email_confirmed_at || usuarioAutenticado?.confirmed_at);
}

function validarPermissaoCadastroPeca(usuario, usuarioAutenticado) {
  if (!usuarioPodeCadastrarPeca(usuario)) {
    throw new AppError(409, 'Configure o nome e a descrição da sua loja antes de cadastrar uma peça.');
  }
  if (!emailFoiConfirmado(usuarioAutenticado)) {
    throw new AppError(403, 'Confirme seu e-mail antes de cadastrar peças.');
  }
}

function montarPayloadPeca(body = {}, fornecedorId) {
  return {
    nome_peca: processarValor(body.nome_peca),
    sku: processarValor(body.sku),
    oem_number: processarValor(body.oem_number),
    num_serie: processarValor(body.num_serie),
    categoria_id: processarNumero(body.categoria_id),
    material_id: processarNumero(body.material_id),
    condicao: processarValor(body.condicao) || 'NOS',
    peso_gramas: processarNumero(body.peso_gramas),
    comprimento_mm: processarNumero(body.comprimento_mm),
    largura_mm: processarNumero(body.largura_mm),
    altura_mm: processarNumero(body.altura_mm),
    detalhes_gravacao: processarValor(body.detalhes_gravacao),
    historico_proveniencia: processarValor(body.historico_proveniencia),
    preco: processarFloat(body.preco),
    estoque_atual: processarNumero(body.estoque_atual) ?? 0,
    imagem: processarValor(body.imagem),
    fornecedor_id: fornecedorId,
  };
}

function validarPayloadCadastro(payload) {
  if (!payload.fornecedor_id) {
    throw new AppError(401, 'Não foi possível vincular a peça ao usuário logado.');
  }
  if (!payload.nome_peca) throw new AppError(400, 'Informe o nome da peça.');
  if (payload.preco === null || payload.preco <= 0) {
    throw new AppError(400, 'Informe um preço válido para a peça.');
  }
  if (!payload.categoria_id) throw new AppError(400, 'Informe a categoria da peça.');
  if (!payload.material_id) throw new AppError(400, 'Informe o material da peça.');
}

function limparPayload(payload) {
  return Object.fromEntries(Object.entries(payload).filter(([, valor]) => valor !== undefined));
}

function sanitizarAtualizacao(updates) {
  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
    throw new AppError(400, 'Envie os dados da peça para continuar.');
  }
  if (Object.keys(updates).length === 0) {
    throw new AppError(400, 'Informe ao menos um campo para atualizar.');
  }

  const sanitizado = {};
  Object.entries(updates).forEach(([campo, valor]) => {
    if (!CAMPOS_ATUALIZAVEIS.has(campo)) return;
    if (CAMPOS_INTEIROS.has(campo)) sanitizado[campo] = processarNumero(valor);
    else if (campo === 'preco') sanitizado[campo] = processarFloat(valor);
    else sanitizado[campo] = processarValor(valor);
  });

  if (Object.keys(sanitizado).length === 0) {
    throw new AppError(400, 'Informe ao menos um campo válido para atualizar.');
  }
  return sanitizado;
}

function criarPaginacao(page, limit) {
  const tamanho = Math.min(Math.max(Number(limit) || 40, 1), 100);
  const pagina = Math.max(Number(page) || 1, 1);
  const inicio = (pagina - 1) * tamanho;
  return { pagina, tamanho, inicio, fim: inicio + tamanho - 1 };
}

module.exports = {
  calcularSimilaridadePeca,
  criarPaginacao,
  limparPayload,
  montarFornecedorPublico,
  montarPayloadPeca,
  obterEmailUsuarioAutenticado,
  sanitizarAtualizacao,
  usuarioPodeCadastrarPeca,
  validarId,
  validarNumeroConsulta,
  validarOrdenacao,
  validarPayloadCadastro,
  validarPermissaoCadastroPeca,
};
