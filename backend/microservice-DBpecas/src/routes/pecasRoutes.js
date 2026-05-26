const express = require('express');
const router = express.Router();
const supabase = require('../config/db');
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

function usuarioPodeCadastrarPeca(usuario) {
  const tipoUsuario = normalizarTexto(usuario?.tipo_usuario);

  return tipoUsuario === 'vendedor' || tipoUsuario === 'ambos';
}

async function obterFornecedor(req) {
  const emailUsuario = obterEmailUsuarioAutenticado(req);

  if (!emailUsuario) {
    throw new AppError(401, 'Não foi possível identificar o e-mail do usuário logado.');
  }

  const { data, error } = await supabase
    .from(USERS_TABLE)
    .select('id, email, tipo_usuario, email_verificado')
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
      403,
      'Apenas usuários vendedores ou compradores/vendedores podem cadastrar peças.'
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
      sort,
      ordem,
      minhas_pecas,
    } = req.query;

    let query = supabase.from(PECAS_TABLE).select('*');

    if (minhas_pecas === 'true') {
      const fornecedor = await obterFornecedor(req);
      query = query.eq('fornecedor_id', fornecedor.id);
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

    const { data, error } = await query.order(sortField, { ascending });

    if (error) {
      throw error;
    }

    return res.json(data || []);
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