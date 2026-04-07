const express = require('express');
const router = express.Router();
const db = require('../config/db');
const AppError = require('../utils/AppError');

const SORT_FIELDS = {
  id: 'id',
  preco: 'preco',
  data: 'data_cadastro',
  data_cadastro: 'data_cadastro',
  estoque: 'estoque_atual',
  estoque_atual: 'estoque_atual',
  nome: 'nome_peca',
  nome_peca: 'nome_peca'
};

function validarId(id) {
  if (!/^\d+$/.test(String(id)) || Number(id) < 1) {
    throw new AppError(400, 'Informe um identificador válido.');
  }
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
  return val;
}

function processarNumero(val) {
  if (val === '' || val === null || val === undefined || val === '0') return null;
  const num = parseInt(val, 10);
  return Number.isNaN(num) ? null : num;
}

function processarFloat(val) {
  if (val === '' || val === null || val === undefined) return null;
  const num = parseFloat(val);
  return Number.isNaN(num) ? null : num;
}

router.post('/cadastrar', async (req, res, next) => {
  const {
    nome_peca,
    sku,
    oem_number,
    num_serie,
    categoria_id,
    material_id,
    condicao,
    peso_gramas,
    comprimento_mm,
    largura_mm,
    altura_mm,
    detalhes_gravacao,
    historico_proveniencia,
    preco,
    estoque_atual
  } = req.body;

  if (!nome_peca || nome_peca.trim() === '') {
    return next(new AppError(400, 'Informe o nome da peça.'));
  }

  if (!preco) {
    return next(new AppError(400, 'Informe o preço da peça.'));
  }

  if (processarFloat(preco) === null) {
    return next(new AppError(400, 'Informe um preço válido para a peça.'));
  }

  try {
    const values = [
      nome_peca.trim(),
      processarValor(sku),
      processarValor(oem_number),
      processarValor(num_serie),
      processarNumero(categoria_id),
      processarNumero(material_id),
      condicao || 'NOS',
      processarNumero(peso_gramas),
      processarNumero(comprimento_mm),
      processarNumero(largura_mm),
      processarNumero(altura_mm),
      processarValor(detalhes_gravacao),
      processarValor(historico_proveniencia),
      processarFloat(preco),
      processarNumero(estoque_atual) || 0
    ];

    const query = `
      INSERT INTO pecas (
        nome_peca, sku, oem_number, num_serie, categoria_id, material_id,
        condicao, peso_gramas, comprimento_mm, largura_mm, altura_mm,
        detalhes_gravacao, historico_proveniencia, preco, estoque_atual
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.execute(query, values);

    return res.status(201).json({
      id: result.insertId,
      message: 'Peça cadastrada com sucesso!'
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
      ordem
    } = req.query;

    let query = 'SELECT * FROM pecas WHERE 1=1';
    const params = [];

    if (categoria_id) {
      query += ' AND categoria_id = ?';
      params.push(validarNumeroConsulta(categoria_id, 'categoria'));
    }

    if (material_id) {
      query += ' AND material_id = ?';
      params.push(validarNumeroConsulta(material_id, 'material'));
    }

    if (condicao) {
      query += ' AND condicao = ?';
      params.push(condicao);
    }

    if (oem_number) {
      query += ' AND oem_number = ?';
      params.push(oem_number);
    }

    if (num_serie) {
      query += ' AND num_serie = ?';
      params.push(num_serie);
    }

    if (nome) {
      query += ' AND nome_peca LIKE ?';
      params.push(`%${nome}%`);
    }

    if (min_preco) {
      query += ' AND preco >= ?';
      params.push(validarNumeroConsulta(min_preco, 'preço mínimo'));
    }

    if (max_preco) {
      query += ' AND preco <= ?';
      params.push(validarNumeroConsulta(max_preco, 'preço máximo'));
    }

    if (min_estoque) {
      query += ' AND estoque_atual >= ?';
      params.push(validarNumeroConsulta(min_estoque, 'estoque mínimo'));
    }

    const sortField = validarOrdenacao(sort);
    const sortOrder = ordem && String(ordem).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    query += ` ORDER BY ${sortField} ${sortOrder}`;

    const [rows] = await db.execute(query, params);
    return res.json(rows);
  } catch (error) {
    return next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    validarId(id);

    const [rows] = await db.execute('SELECT * FROM pecas WHERE id = ?', [id]);

    if (rows.length === 0) {
      throw new AppError(404, 'Peça não encontrada.');
    }

    return res.json(rows[0]);
  } catch (error) {
    return next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    validarId(id);
    validarAtualizacao(updates);

    const [pecas] = await db.execute('SELECT * FROM pecas WHERE id = ?', [id]);

    if (pecas.length === 0) {
      throw new AppError(404, 'Peça não encontrada.');
    }

    const campos = Object.keys(updates);
    const valores = Object.values(updates);
    const setClause = campos.map((campo) => `${campo} = ?`).join(', ');

    const query = `UPDATE pecas SET ${setClause} WHERE id = ?`;
    await db.execute(query, [...valores, id]);

    return res.json({
      id: Number(id),
      message: 'Peça atualizada com sucesso!'
    });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    validarId(id);

    const [pecas] = await db.execute('SELECT * FROM pecas WHERE id = ?', [id]);

    if (pecas.length === 0) {
      throw new AppError(404, 'Peça não encontrada.');
    }

    await db.execute('DELETE FROM pecas WHERE id = ?', [id]);

    return res.json({
      message: 'Peça deletada com sucesso!'
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
