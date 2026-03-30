const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ===== ROTAS POST (ESPECÍFICAS) - DEVEM VIR PRIMEIRO =====

// Cadastrar nova peça
router.post('/cadastrar', async (req, res) => {
  console.log('=== RECEBENDO CADASTRO ===');
  console.log('Body completo:', req.body);

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

  // Validações básicas
  if (!nome_peca || nome_peca.trim() === '') {
    console.error('Erro: nome_peca vazio');
    return res.status(400).json({ error: "Nome da peça é obrigatório" });
  }

  if (!preco) {
    console.error('Erro: preco vazio');
    return res.status(400).json({ error: "Preço é obrigatório" });
  }

  try {
    // Processa valores, mantendo vazios como null apenas se realmente vazios
    const processarValor = (val) => {
      if (val === '' || val === null || val === undefined) return null;
      return val;
    };

    const processarNumero = (val) => {
      if (val === '' || val === null || val === undefined || val === '0') return null;
      const num = parseInt(val);
      return isNaN(num) ? null : num;
    };

    const processarFloat = (val) => {
      if (val === '' || val === null || val === undefined) return null;
      const num = parseFloat(val);
      return isNaN(num) ? null : num;
    };

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

    console.log('Valores processados para INSERT:', values);

    const query = `
      INSERT INTO pecas (
        nome_peca, sku, oem_number, num_serie, categoria_id, material_id,
        condicao, peso_gramas, comprimento_mm, largura_mm, altura_mm,
        detalhes_gravacao, historico_proveniencia, preco, estoque_atual
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.execute(query, values);

    console.log('Peça inserida com ID:', result.insertId);

    res.status(201).json({
      id: result.insertId,
      message: "Peça cadastrada com sucesso!"
    });
  } catch (error) {
    console.error('Erro ao cadastrar:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== ROTAS GET =====

// Listar todas as peças
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM pecas');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar peças" });
  }
});

// Buscar peça por ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.execute('SELECT * FROM pecas WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Peça não encontrada" });
    }
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== ROTAS PUT (GENÉRICAS) =====

// Atualizar peça
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    // Verifica se peça existe
    const [pecas] = await db.execute('SELECT * FROM pecas WHERE id = ?', [id]);
    if (pecas.length === 0) {
      return res.status(404).json({ error: "Peça não encontrada" });
    }

    // Constrói query de atualização dinamicamente
    const campos = Object.keys(updates);
    const valores = Object.values(updates);
    const setClause = campos.map(campo => `${campo} = ?`).join(', ');

    const query = `UPDATE pecas SET ${setClause} WHERE id = ?`;
    await db.execute(query, [...valores, id]);

    res.json({
      id: parseInt(id),
      message: "Peça atualizada com sucesso!"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===== ROTAS DELETE (GENÉRICAS) =====

// Deletar peça
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [pecas] = await db.execute('SELECT * FROM pecas WHERE id = ?', [id]);
    if (pecas.length === 0) {
      return res.status(404).json({ error: "Peça não encontrada" });
    }

    await db.execute('DELETE FROM pecas WHERE id = ?', [id]);
    res.json({ message: "Peça deletada com sucesso!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
