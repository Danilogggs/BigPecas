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
  'detalhes_gravacao', 'historico_proveniencia', 'preco', 'estoque_atual', 'imagem', 'url_video', 'moeda_base',
]);

const CAMPOS_INTEIROS = new Set([
  'categoria_id', 'material_id', 'peso_gramas', 'comprimento_mm', 'largura_mm',
  'altura_mm', 'estoque_atual',
]);

function validarMoeda(valor) {
  if (typeof valor !== 'string' || !/^[A-Z]{3}$/.test(valor)) throw new AppError(400, 'Moeda inválida.');
  return valor;
}
function validarMidia(valor, video) {
  if (valor == null || valor === '') return null;
  if (typeof valor !== 'string') throw new AppError(400, 'Mídia inválida.');
  if (!video && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(valor) && valor.length <= 8000000) return valor;
  try {
    const url = new URL(valor);
    if (url.protocol === 'https:' && !url.username && !url.password && valor.length < 4096) return valor;
  } catch {}
  throw new AppError(400, video ? 'Informe uma URL HTTPS de vídeo MP4/WebM.' : 'Imagem inválida.');
}
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
  if (!Number.isFinite(numero)) {
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

function calcularScoreFornecedor(_fornecedor, _pecas = [], resumoAvaliacoes = {}) {
  return Number(resumoAvaliacoes.total || 0);
}

function montarFornecedorPublico(fornecedor, pecas = [], resumoAvaliacoes = {}) {
  const pecasComEstoque = pecas.filter((peca) => Number(peca.estoque_atual) > 0);
  const totalAvaliacoes = Number(resumoAvaliacoes.total || 0);
  const mediaAvaliacoes = totalAvaliacoes
    ? Number(resumoAvaliacoes.soma || 0) / totalAvaliacoes
    : 0;
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
    total_avaliacoes: totalAvaliacoes,
    media_avaliacoes: Math.round(mediaAvaliacoes * 10) / 10,
    score_recomendacao: calcularScoreFornecedor(fornecedor, pecas, resumoAvaliacoes),
  };
}

function calcularScoreHistorico(compradas, candidata) {
  const similares = compradas.map((comprada) => calcularSimilaridadePeca(comprada, candidata));
  const melhorSimilaridade = Math.max(0, ...similares);
  const recorrenciaCategoria = compradas.filter(
    (comprada) => comprada.categoria_id && comprada.categoria_id === candidata.categoria_id,
  ).length;
  const recorrenciaMaterial = compradas.filter(
    (comprada) => comprada.material_id && comprada.material_id === candidata.material_id,
  ).length;
  return melhorSimilaridade + Math.min(recorrenciaCategoria * 8, 24) + Math.min(recorrenciaMaterial * 4, 12);
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
    imagem: validarMidia(body.imagem, false),
    url_video: validarMidia(body.url_video, true),
    moeda_base: validarMoeda(body.moeda_base || 'BRL'),
    preco_base: processarFloat(body.preco),
    status_publicacao: 'pendente_validacao',
    fornecedor_id: fornecedorId,
  };
}

function validarPayloadCadastro(payload) {
  if (!payload.fornecedor_id) {
    throw new AppError(401, 'Não foi possível vincular a peça ao usuário logado.');
  }
  if (!payload.nome_peca) throw new AppError(400, 'Informe o nome da peça.');
  if (!Number.isFinite(payload.preco) || payload.preco <= 0) {
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
    else if (campo === 'preco') {
      const preco = processarFloat(valor);
      if (!Number.isFinite(preco) || preco <= 0) throw new AppError(400, 'Preço inválido.');
      sanitizado.preco_base = preco;
    }
    else if (campo === 'moeda_base') sanitizado[campo] = validarMoeda(valor);
    else if (campo === 'imagem' || campo === 'url_video') sanitizado[campo] = validarMidia(valor, campo === 'url_video');
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
  calcularScoreHistorico,
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
