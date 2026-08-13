const express = require('express');
const router = express.Router();
const { supabaseAdmin: supabase } = require('../config/supabaseClient');
const AppError = require('../utils/AppError');

const PECAS_TABLE = process.env.SUPABASE_PECAS_TABLE || 'pecas';
const USERS_TABLE = process.env.SUPABASE_USER_TABLE || 'users';

const SORT_FIELDS = {
  id: 'id',
  preco: 'preco',
  data: 'data_cadastro',
  data_cadastro: 'data_cadastro',
  created_at: 'created_at',
  estoque: 'estoque_atual',
  estoque_atual: 'estoque_atual',
  nome: 'nome_peca',
  nome_peca: 'nome_peca',
};

const ALLOWED_UPDATE_FIELDS = new Set([
  'nome_peca',
  'sku',
  'oem_number',
  'num_serie',
  'categoria_id',
  'material_id',
  'condicao',
  'peso_gramas',
  'comprimento_mm',
  'largura_mm',
  'altura_mm',
  'detalhes_gravacao',
  'historico_proveniencia',
  'preco',
  'estoque_atual',
  'imagem',
]);

function validarId(id) {
  if (!/^\d+$/.test(String(id)) || Number(id) < 1) {
    throw new AppError(400, 'Informe um identificador válido.');
  }

  return Number(id);
}

function validarOrdenacao(sort) {
  if (!sort) {
    return 'id';
  }

  const campoOrdenacao = SORT_FIELDS[sort];

  if (!campoOrdenacao) {
    throw new AppError(400, 'O campo de ordenação informado é inválido.');
  }

  return campoOrdenacao;
}

function validarNumeroConsulta(valor, nomeCampo) {
  if (valor === undefined || valor === null || valor === '') {
    return null;
  }

  const numero = Number(valor);

  if (Number.isNaN(numero)) {
    throw new AppError(400, `Informe um valor válido para ${nomeCampo}.`);
  }

  return numero;
}

function validarAtualizacao(updates) {
  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
    throw new AppError(400, 'Envie os dados da peça para continuar.');
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError(400, 'Informe ao menos um campo para atualizar.');
  }
}

function processarValor(val) {
  if (val === '' || val === null || val === undefined) return null;
  return typeof val === 'string' ? val.trim() : val;
}

function processarNumero(val) {
  if (val === '' || val === null || val === undefined) return null;
  const num = parseInt(val, 10);
  return Number.isNaN(num) ? null : num;
}

function processarFloat(val) {
  if (val === '' || val === null || val === undefined) return null;
  const num = parseFloat(String(val).replace(',', '.'));
  return Number.isNaN(num) ? null : num;
}

function obterEmailUsuarioAutenticado(req) {
  return (
    req.user?.email ||
    req.user?.user?.email ||
    req.authUser?.email ||
    req.usuario?.email ||
    null
  );
}

function normalizarTexto(valor) {
  return String(valor || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}


function calcularSimilaridadePeca(pecaBase, pecaCandidata) {
  let score = 0;

  if (pecaBase.categoria_id && pecaBase.categoria_id === pecaCandidata.categoria_id) {
    score += 40;
  }

  if (pecaBase.material_id && pecaBase.material_id === pecaCandidata.material_id) {
    score += 20;
  }

  if (pecaBase.condicao && pecaBase.condicao === pecaCandidata.condicao) {
    score += 15;
  }

  if (pecaBase.fornecedor_id && pecaBase.fornecedor_id === pecaCandidata.fornecedor_id) {
    score += 10;
  }

  const precoBase = Number(pecaBase.preco);
  const precoCandidata = Number(pecaCandidata.preco);

  if (!Number.isNaN(precoBase) && !Number.isNaN(precoCandidata) && precoBase > 0) {
    const diferencaPercentual = Math.abs(precoBase - precoCandidata) / precoBase;

    if (diferencaPercentual <= 0.2) {
      score += 15;
    } else if (diferencaPercentual <= 0.5) {
      score += 8;
    }
  }

  const nomeBase = normalizarTexto(pecaBase.nome_peca);
  const nomeCandidata = normalizarTexto(pecaCandidata.nome_peca);

  const palavrasBase = nomeBase
    .split(' ')
    .filter((palavra) => palavra.length >= 4);

  const possuiPalavraRelacionada = palavrasBase.some((palavra) =>
    nomeCandidata.includes(palavra)
  );

  if (possuiPalavraRelacionada) {
    score += 10;
  }

  return score;
}

function calcularScoreFornecedor(fornecedor, pecasFornecedor = []) {
  let score = 0;

  const pecasComEstoque = pecasFornecedor.filter(
    (peca) => Number(peca.estoque_atual) > 0
  );

  score += pecasFornecedor.length * 10;
  score += pecasComEstoque.length * 5;

  if (fornecedor.nome_loja) score += 15;
  if (fornecedor.descricao_loja) score += 10;
  if (fornecedor.telefone) score += 5;
  if (fornecedor.email_verificado === true) score += 10;

  return score;
}

function montarFornecedorPublico(fornecedor, pecasFornecedor = []) {
  const pecasComEstoque = pecasFornecedor.filter(
    (peca) => Number(peca.estoque_atual) > 0
  );

  return {
    id: fornecedor.id,
    full_name: fornecedor.full_name,
    nome_loja: fornecedor.nome_loja,
    descricao_loja: fornecedor.descricao_loja,
    email: fornecedor.email,
    telefone: fornecedor.telefone,
    tipo_usuario: 'ambos',
    email_verificado: fornecedor.email_verificado,
    total_pecas: pecasFornecedor.length,
    pecas_com_estoque: pecasComEstoque.length,
    score_recomendacao: calcularScoreFornecedor(fornecedor, pecasFornecedor),
  };
}

function usuarioPodeCadastrarPeca(usuario) {
  return Boolean(
    usuario?.id &&
    processarValor(usuario.nome_loja) &&
    processarValor(usuario.descricao_loja)
  );
}

async function obterFornecedor(req) {
  const emailUsuario = obterEmailUsuarioAutenticado(req);

  if (!emailUsuario) {
    throw new AppError(401, 'Não foi possível identificar o e-mail do usuário logado.');
  }

  const { data, error } = await supabase
    .from(USERS_TABLE)
    .select('id, email, tipo_usuario, nome_loja, descricao_loja, email_verificado')
    .eq('email', emailUsuario)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.id) {
    throw new AppError(404, 'Usuário fornecedor não encontrado na tabela users.');
  }

  return data;
}

function isSupabaseEmailConfirmed(user) {
  return Boolean(user?.email_confirmed_at || user?.confirmed_at);
}

function validarPermissaoCadastroPeca(usuario, authUser) {
  if (!usuarioPodeCadastrarPeca(usuario)) {
    throw new AppError(
      409,
      'Configure o nome e a descrição da sua loja antes de cadastrar uma peça.'
    );
  }

  if (!isSupabaseEmailConfirmed(authUser)) {
    throw new AppError(
      403,
      'Confirme seu e-mail antes de cadastrar peças.'
    );
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

  if (!payload.nome_peca) {
    throw new AppError(400, 'Informe o nome da peça.');
  }

  if (payload.preco === null || payload.preco <= 0) {
    throw new AppError(400, 'Informe um preço válido para a peça.');
  }

  if (!payload.categoria_id) {
    throw new AppError(400, 'Informe a categoria da peça.');
  }

  if (!payload.material_id) {
    throw new AppError(400, 'Informe o material da peça.');
  }
}

function limparPayload(payload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );
}

async function buscarPecaPorId(id) {
  const { data, error } = await supabase
    .from(PECAS_TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

router.post('/cadastrar', async (req, res, next) => {
  try {
    const fornecedor = await obterFornecedor(req);

    validarPermissaoCadastroPeca(fornecedor, req.user);

    const payload = limparPayload(montarPayloadPeca(req.body, fornecedor.id));

    validarPayloadCadastro(payload);

    const { data, error } = await supabase
      .from(PECAS_TABLE)
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return res.status(201).json({
      id: data?.id,
      message: 'Peça cadastrada com sucesso!',
      peca: data,
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const {
      nome,
      categoria_id,
      material_id,
      num_serie,
      condicao,
      min_preco,
      max_preco,
      oem_number,
      min_estoque,
      fornecedor_id,
      sort,
      ordem,
      minhas_pecas,
      page,
      limit,
    } = req.query;

    let query = supabase.from(PECAS_TABLE).select('*');

    if (minhas_pecas === 'true') {
      const fornecedor = await obterFornecedor(req);
      query = query.eq('fornecedor_id', fornecedor.id);
    }

    if (fornecedor_id) {
      query = query.eq('fornecedor_id', validarNumeroConsulta(fornecedor_id, 'fornecedor'));
    }

    if (categoria_id) {
      query = query.eq('categoria_id', validarNumeroConsulta(categoria_id, 'categoria'));
    }

    if (material_id) {
      query = query.eq('material_id', validarNumeroConsulta(material_id, 'material'));
    }

    if (condicao) {
      query = query.eq('condicao', condicao);
    }

    if (oem_number) {
      query = query.eq('oem_number', oem_number);
    }

    if (num_serie) {
      query = query.eq('num_serie', num_serie);
    }

    if (nome) {
      query = query.ilike('nome_peca', `%${nome}%`);
    }

    if (min_preco !== undefined && min_preco !== '') {
      query = query.gte('preco', validarNumeroConsulta(min_preco, 'preço mínimo'));
    }

    if (max_preco !== undefined && max_preco !== '') {
      query = query.lte('preco', validarNumeroConsulta(max_preco, 'preço máximo'));
    }

    if (min_estoque !== undefined && min_estoque !== '') {
      query = query.gte('estoque_atual', validarNumeroConsulta(min_estoque, 'estoque mínimo'));
    }

    const sortField = validarOrdenacao(sort);
    const ascending = ordem && String(ordem).toLowerCase() === 'asc';

    query = query.order(sortField, { ascending });

    // Paginação — padrão: 40 itens por página
    const pageSize  = Math.min(Math.max(Number(limit) || 40, 1), 100);
    const pageIndex = Math.max(Number(page) || 1, 1);
    const from      = (pageIndex - 1) * pageSize;
    const to        = from + pageSize - 1;

    const { data, error, count } = await query
      .select('*', { count: 'estimated' })
      .range(from, to);

    if (error) {
      throw error;
    }

    res.set('X-Total-Count', String(count ?? 0));
    res.set('X-Page',        String(pageIndex));
    res.set('X-Page-Size',   String(pageSize));
    res.set('Access-Control-Expose-Headers', 'X-Total-Count, X-Page, X-Page-Size');

    return res.json(data || []);
  } catch (error) {
    return next(error);
  }
});


router.get('/fornecedores/recomendados', async (req, res, next) => {
  try {
    const limite = validarNumeroConsulta(req.query.limite, 'limite') || 4;

    const { data: fornecedores, error: fornecedoresError } = await supabase
      .from(USERS_TABLE)
      .select('id, full_name, email, tipo_usuario, nome_loja, descricao_loja, telefone, email_verificado');

    if (fornecedoresError) {
      throw fornecedoresError;
    }

    const fornecedoresComLoja = (fornecedores || []).filter(usuarioPodeCadastrarPeca);

    if (!fornecedoresComLoja.length) {
      return res.json({ total: 0, fornecedores: [] });
    }

    const fornecedorIds = fornecedoresComLoja.map((fornecedor) => fornecedor.id);

    const { data: pecas, error: pecasError } = await supabase
      .from(PECAS_TABLE)
      .select('id, nome_peca, fornecedor_id, preco, estoque_atual, imagem')
      .in('fornecedor_id', fornecedorIds);

    if (pecasError) {
      throw pecasError;
    }

    const ranking = fornecedoresComLoja
      .map((fornecedor) => {
        const pecasFornecedor = (pecas || []).filter(
          (peca) => String(peca.fornecedor_id) === String(fornecedor.id)
        );

        return montarFornecedorPublico(fornecedor, pecasFornecedor);
      })
      .filter((fornecedor) => fornecedor.total_pecas > 0)
      .sort((a, b) => b.score_recomendacao - a.score_recomendacao)
      .slice(0, limite);

    return res.json({
      total: ranking.length,
      fornecedores: ranking,
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/fornecedores/:id/perfil', async (req, res, next) => {
  try {
    const id = validarId(req.params.id);

    const { data: fornecedor, error: fornecedorError } = await supabase
      .from(USERS_TABLE)
      .select('id, full_name, email, tipo_usuario, nome_loja, descricao_loja, telefone, email_verificado, created_at')
      .eq('id', id)
      .maybeSingle();

    if (fornecedorError) {
      throw fornecedorError;
    }

    if (!fornecedor) {
      throw new AppError(404, 'Fornecedor não encontrado.');
    }

    if (!usuarioPodeCadastrarPeca(fornecedor)) {
      throw new AppError(404, 'Este usuário não possui perfil de vendedor.');
    }

    const { data: pecas, error: pecasError } = await supabase
      .from(PECAS_TABLE)
      .select('*')
      .eq('fornecedor_id', id)
      .order('id', { ascending: false });

    if (pecasError) {
      throw pecasError;
    }

    return res.json({
      fornecedor: montarFornecedorPublico(fornecedor, pecas || []),
      pecas: pecas || [],
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/:id/recomendacoes', async (req, res, next) => {
  try {
    const id = validarId(req.params.id);
    const limite = validarNumeroConsulta(req.query.limite, 'limite') || 4;

    const pecaBase = await buscarPecaPorId(id);

    if (!pecaBase) {
      throw new AppError(404, 'Peça base não encontrada para gerar recomendações.');
    }

    const filtrosOr = [];

    if (pecaBase.categoria_id) {
      filtrosOr.push(`categoria_id.eq.${pecaBase.categoria_id}`);
    }

    if (pecaBase.material_id) {
      filtrosOr.push(`material_id.eq.${pecaBase.material_id}`);
    }

    if (pecaBase.condicao) {
      filtrosOr.push(`condicao.eq.${pecaBase.condicao}`);
    }

    let query = supabase
      .from(PECAS_TABLE)
      .select('*')
      .neq('id', id)
      .gt('estoque_atual', 0)
      .limit(30);

    if (filtrosOr.length > 0) {
      query = query.or(filtrosOr.join(','));
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const recomendacoes = (data || [])
      .map((peca) => ({
        ...peca,
        score_recomendacao: calcularSimilaridadePeca(pecaBase, peca),
      }))
      .filter((peca) => peca.score_recomendacao > 0)
      .sort((a, b) => b.score_recomendacao - a.score_recomendacao)
      .slice(0, limite);

    return res.json({
      peca_base_id: id,
      total: recomendacoes.length,
      recomendacoes,
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = validarId(req.params.id);
    const peca = await buscarPecaPorId(id);

    if (!peca) {
      throw new AppError(404, 'Peça não encontrada.');
    }

    return res.json(peca);
  } catch (error) {
    return next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const id = validarId(req.params.id);
    const updates = req.body;
    const fornecedor = await obterFornecedor(req);

    validarAtualizacao(updates);

    const peca = await buscarPecaPorId(id);

    if (!peca) {
      throw new AppError(404, 'Peça não encontrada.');
    }

    if (String(peca.fornecedor_id) !== String(fornecedor.id)) {
      throw new AppError(403, 'Você só pode atualizar peças cadastradas por você.');
    }

    const sanitizedUpdates = {};

    Object.entries(updates).forEach(([field, value]) => {
      if (!ALLOWED_UPDATE_FIELDS.has(field)) {
        return;
      }

      if ([
        'categoria_id',
        'material_id',
        'peso_gramas',
        'comprimento_mm',
        'largura_mm',
        'altura_mm',
        'estoque_atual',
      ].includes(field)) {
        sanitizedUpdates[field] = processarNumero(value);
        return;
      }

      if (field === 'preco') {
        sanitizedUpdates[field] = processarFloat(value);
        return;
      }

      sanitizedUpdates[field] = processarValor(value);
    });

    if (Object.keys(sanitizedUpdates).length === 0) {
      throw new AppError(400, 'Informe ao menos um campo válido para atualizar.');
    }

    const { data, error } = await supabase
      .from(PECAS_TABLE)
      .update(sanitizedUpdates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return res.json({
      id,
      message: 'Peça atualizada com sucesso!',
      peca: data,
    });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = validarId(req.params.id);
    const fornecedor = await obterFornecedor(req);
    const peca = await buscarPecaPorId(id);

    if (!peca) {
      throw new AppError(404, 'Peça não encontrada.');
    }

    if (String(peca.fornecedor_id) !== String(fornecedor.id)) {
      throw new AppError(403, 'Você só pode deletar peças cadastradas por você.');
    }

    const { error } = await supabase
      .from(PECAS_TABLE)
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return res.json({
      message: 'Peça deletada com sucesso!',
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
